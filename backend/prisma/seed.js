//////////////////////////////////////////////////////////
// 🌱 DATABASE SEEDER
// Run: npm run seed
// Safe to run multiple times — uses upsert throughout
//////////////////////////////////////////////////////////

const prisma = require("../prismaClient");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

async function main() {
  console.log("🌱 Starting database seed...");
  console.log(
    "📡 Connected to:",
    process.env.DATABASE_URL?.split("@")[1] || "database"
  );

  const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;

  //////////////////////////////////////////////////////////
  // PASSWORDS — from env with strong fallbacks
  //////////////////////////////////////////////////////////

  const SUPER_ADMIN_PASSWORD =
    process.env.SEED_SUPER_ADMIN_PASSWORD || "SuperAdmin@123";
  const ADMIN_PASSWORD =
    process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
  const STAFF_PASSWORD =
    process.env.SEED_STAFF_PASSWORD || "Staff@12345";
  const GUEST_PASSWORD =
    process.env.SEED_GUEST_PASSWORD || "Guest@12345";

  const superAdminHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, rounds);
  const adminHash      = await bcrypt.hash(ADMIN_PASSWORD, rounds);
  const staffHash      = await bcrypt.hash(STAFF_PASSWORD, rounds);
  const guestHash      = await bcrypt.hash(GUEST_PASSWORD, rounds);

  //////////////////////////////////////////////////////////
  // STEP 1 — SUPER ADMIN
  //////////////////////////////////////////////////////////

  const superAdmin = await prisma.user.upsert({
    where:  { email: "superadmin@riccdigital.com" },
    update: {},
    create: {
      name:       "Super Admin",
      email:      "superadmin@riccdigital.com",
      password:   superAdminHash,
      role:       "SUPER_ADMIN",
      propertyId: null,
    },
  });

  console.log("✅ SUPER_ADMIN:", superAdmin.email);

  //////////////////////////////////////////////////////////
  // STEP 2 — PROPERTY
  //////////////////////////////////////////////////////////

  let property = await prisma.property.findFirst({
    where: { name: "Grand Ricc Hotel" },
  });

  if (!property) {
    property = await prisma.property.create({
      data: {
        name:    "Grand Ricc Hotel",
        ownerId: superAdmin.id,
      },
    });
  }

  console.log("✅ Property:", property.name);

  //////////////////////////////////////////////////////////
  // STEP 3 — ADMIN USER
  //////////////////////////////////////////////////////////

  const admin = await prisma.user.upsert({
    where:  { email: "admin@grandricc.com" },
    update: {},
    create: {
      name:       "Hotel Admin",
      email:      "admin@grandricc.com",
      password:   adminHash,
      role:       "ADMIN",
      propertyId: property.id,
    },
  });

  console.log("✅ ADMIN:", admin.email);

  //////////////////////////////////////////////////////////
  // STEP 4 — UPDATE PROPERTY OWNER TO ADMIN
  //////////////////////////////////////////////////////////

  await prisma.property.update({
    where: { id: property.id },
    data:  { ownerId: admin.id },
  });

  //////////////////////////////////////////////////////////
  // STEP 5 — STAFF USERS
  //////////////////////////////////////////////////////////

  const staffData = [
    { name: "Alice Mwangi",  email: "alice@grandricc.com"  },
    { name: "Brian Ochieng", email: "brian@grandricc.com"  },
    { name: "Carol Akinyi",  email: "carol@grandricc.com"  },
  ];

  const staffUsers = [];

  for (const s of staffData) {
    const staff = await prisma.user.upsert({
      where:  { email: s.email },
      update: {},
      create: {
        name:       s.name,
        email:      s.email,
        password:   staffHash,
        role:       "STAFF",
        propertyId: property.id,
      },
    });
    staffUsers.push(staff);
    console.log("✅ STAFF:", staff.email);
  }

  //////////////////////////////////////////////////////////
  // STEP 6 — GUEST USER
  //////////////////////////////////////////////////////////

  const guestEmail = `guest_0712345678_prop${property.id}@riccdigital.internal`;

  const guest = await prisma.user.upsert({
    where:  { email: guestEmail },
    update: {},
    create: {
      name:       "John Doe",
      email:      guestEmail,
      password:   guestHash,
      role:       "GUEST",
      propertyId: property.id,
    },
  });

  console.log("✅ GUEST:", guest.email);

  //////////////////////////////////////////////////////////
  // STEP 7 — ROOMS WITH PERMANENT QR TOKENS
  //////////////////////////////////////////////////////////

  const roomsData = [
    { roomNumber: "101", floor: "1", roomType: "Standard" },
    { roomNumber: "102", floor: "1", roomType: "Standard" },
    { roomNumber: "201", floor: "2", roomType: "Deluxe"   },
    { roomNumber: "202", floor: "2", roomType: "Deluxe"   },
    { roomNumber: "301", floor: "3", roomType: "Suite"    },
  ];

  const rooms = [];

  for (const r of roomsData) {
    let room = await prisma.room.findFirst({
      where: { propertyId: property.id, roomNumber: r.roomNumber },
    });

    if (!room) {
      room = await prisma.room.create({
        data: {
          propertyId: property.id,
          roomNumber: r.roomNumber,
          roomToken:  crypto.randomBytes(32).toString("hex"),
          floor:      r.floor,
          roomType:   r.roomType,
          isActive:   true,
        },
      });
    }

    rooms.push(room);
    console.log(
      `✅ Room: ${room.roomNumber} | QR: ${process.env.APP_URL}/g/room/${room.roomToken}`
    );
  }

  //////////////////////////////////////////////////////////
  // STEP 8 — SERVICE CATEGORIES
  //////////////////////////////////////////////////////////

  let requestCategory = await prisma.serviceCategory.findFirst({
    where: { propertyId: property.id, name: "Housekeeping", type: "request" },
  });

  if (!requestCategory) {
    requestCategory = await prisma.serviceCategory.create({
      data: {
        propertyId: property.id,
        name:       "Housekeeping",
        type:       "request",
        isActive:   true,
      },
    });
  }

  let orderCategory = await prisma.serviceCategory.findFirst({
    where: { propertyId: property.id, name: "Room Service", type: "order" },
  });

  if (!orderCategory) {
    orderCategory = await prisma.serviceCategory.create({
      data: {
        propertyId: property.id,
        name:       "Room Service",
        type:       "order",
        isActive:   true,
      },
    });
  }

  console.log("✅ Categories: Housekeeping, Room Service");

  //////////////////////////////////////////////////////////
  // STEP 9 — SERVICE ITEMS
  //////////////////////////////////////////////////////////

  const serviceItemsData = [
    { categoryId: requestCategory.id, name: "Extra Towels",     isPaid: false, price: null  },
    { categoryId: requestCategory.id, name: "Room Cleaning",    isPaid: false, price: null  },
    { categoryId: requestCategory.id, name: "Extra Pillows",    isPaid: false, price: null  },
    { categoryId: orderCategory.id,   name: "Club Sandwich",    isPaid: true,  price: 12.99 },
    { categoryId: orderCategory.id,   name: "Breakfast Platter",isPaid: true,  price: 18.50 },
    { categoryId: orderCategory.id,   name: "Bottle of Water",  isPaid: false, price: null  },
  ];

  for (const item of serviceItemsData) {
    const existing = await prisma.serviceItem.findFirst({
      where: {
        propertyId: property.id,
        categoryId: item.categoryId,
        name:       item.name,
      },
    });

    if (!existing) {
      await prisma.serviceItem.create({
        data: {
          propertyId: property.id,
          categoryId: item.categoryId,
          name:       item.name,
          isPaid:     item.isPaid,
          price:      item.price,
          isActive:   true,
        },
      });
    }

    console.log(
      `✅ Service Item: ${item.name} | Paid: ${item.isPaid}`
    );
  }

  //////////////////////////////////////////////////////////
  // STEP 10 — SAMPLE BOOKING + GUEST SESSION (ROOM 101)
  //////////////////////////////////////////////////////////

  const existingBooking = await prisma.booking.findFirst({
    where: {
      propertyId: property.id,
      roomNumber: "101",
      status:     "confirmed",
    },
  });

  if (!existingBooking) {
    const checkoutDate = new Date();
    checkoutDate.setDate(checkoutDate.getDate() + 3);

    const booking = await prisma.booking.create({
      data: {
        propertyId:    property.id,
        firstName:     "John",
        surname:       "Doe",
        phone:         "0712345678",
        roomNumber:    "101",
        roomId:        rooms[0].id,
        status:        "confirmed",
        paymentStatus: "pending",
        checkoutDate,
      },
    });

    const existingSession = await prisma.guestSession.findFirst({
      where: { roomId: rooms[0].id, status: "active" },
    });

    if (!existingSession) {
      await prisma.guestSession.create({
        data: {
          propertyId: property.id,
          roomId:     rooms[0].id,
          firstName:  "John",
          surname:    "Doe",
          phone:      "0712345678",
          roomNumber: "101",
          bookingId:  booking.id,
          status:     "active",
          expiresAt:  checkoutDate,
        },
      });
    }

    console.log("✅ Sample booking + session: Room 101 — John Doe");
  } else {
    console.log("ℹ️  Room 101 booking already exists — skipping");
  }

  //////////////////////////////////////////////////////////
  // SEED SUMMARY
  //////////////////////////////////////////////////////////

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║         🌱 SEED COMPLETE                  ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  SUPER_ADMIN: superadmin@riccdigital.com ║`);
  console.log(`║  Password:    ${SUPER_ADMIN_PASSWORD.padEnd(27)}║`);
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  ADMIN:    admin@grandricc.com           ║`);
  console.log(`║  Password: ${ADMIN_PASSWORD.padEnd(31)}║`);
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  STAFF:    alice / brian / carol         ║`);
  console.log(`║  Password: ${STAFF_PASSWORD.padEnd(31)}║`);
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  Room 101 active — John Doe              ║`);
  console.log(`║  Scan QR to test guest access            ║`);
  console.log("╚══════════════════════════════════════════╝\n");
}

//////////////////////////////////////////////////////////
// RUN SEED
//////////////////////////////////////////////////////////

main()
  .catch((error) => {
    console.error("❌ Seed Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });