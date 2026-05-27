//////////////////////////////////////////////////////////
// 📅 BOOKING ROUTES
//////////////////////////////////////////////////////////

const express = require("express");
const router = express.Router();

const prisma = require("../prismaClient");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { generateToken } = require("../utils/jwt");
const safeUser = require("../utils/safeUser");
// ADD import at the top of the file
const { getPropertyFilter } = require("../utils/scopeByRole");

//////////////////////////////////////////////////////////
// BOOKING STATUS LIFECYCLE
//////////////////////////////////////////////////////////

const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
];

//////////////////////////////////////////////////////////
// 🚪 SETUP ROOM — ADMIN ACTION (ONE TIME ONLY)
// POST /api/bookings/rooms
//
// Admin creates rooms once when setting up property.
// Each room gets a permanent QR token.
// QR printed once, fixed to room permanently.
// www.hotela.com/g/room/<roomToken>
//////////////////////////////////////////////////////////

router.post("/rooms",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const { roomNumber, floor, roomType } = req.body;

      if (!roomNumber || roomNumber.trim() === "") {
        return res.status(400).json({ error: "roomNumber is required", code: "MISSING_FIELD" });
      }

      const propertyId = req.user.propertyId;

      //////////////////////////////////////////////////////////
      // CHECK ROOM DOESN'T ALREADY EXIST
      //////////////////////////////////////////////////////////

      const existing = await prisma.room.findFirst({
        where: { propertyId, roomNumber: roomNumber.trim() },
      });

      if (existing) {
        return res.status(409).json({
          error: `Room ${roomNumber} already exists for this property`,
          code: "ROOM_EXISTS",
          existingQrUrl: `${process.env.APP_URL}/g/room/${existing.roomToken}`,
        });
      }

      //////////////////////////////////////////////////////////
      // GENERATE PERMANENT ROOM TOKEN
      // This never changes — it is the QR code identity
      //////////////////////////////////////////////////////////

      const roomToken = crypto.randomBytes(32).toString("hex");

      const room = await prisma.room.create({
        data: {
          propertyId,
          roomNumber: roomNumber.trim(),
          roomToken,
          floor: floor || null,
          roomType: roomType || null,
        },
      });

      const qrUrl = `${process.env.APP_URL}/g/room/${roomToken}`;

      console.log(
        `🚪 Room created | Number: ${roomNumber} | Property: ${propertyId} | QR: ${qrUrl}`
      );

      res.status(201).json({
        message: `Room ${roomNumber} created. Print this QR once and fix it permanently in the room.`,
        room: {
          id: room.id,
          roomNumber: room.roomNumber,
          floor: room.floor,
          roomType: room.roomType,
        },
        qr: {
          url: qrUrl,
          token: roomToken,
          instructions: "Print this QR code once. Fix it to the room. It works for every future guest.",
        },
      });

    } catch (error) {
      console.error("❌ Create room error:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  }
);

//////////////////////////////////////////////////////////
// 📅 CREATE BOOKING — STAFF/ADMIN ACTION
// POST /api/bookings
//
// Staff checks in guest.
// System links guest to the room's permanent QR automatically.
// No new QR ever printed.
//////////////////////////////////////////////////////////

router.post("/",
  authenticate,
  authorizeRoles("ADMIN", "STAFF"),
  async (req, res) => {
    try {

      //////////////////////////////////////////////////////////
      // STEP 1 — VALIDATE INPUT
      //////////////////////////////////////////////////////////

      const { firstName, surname, phone, roomNumber, checkoutDate } = req.body;

      if (!firstName || firstName.trim() === "") {
        return res.status(400).json({ error: "firstName is required", code: "MISSING_FIELD" });
      }

      if (!surname || surname.trim() === "") {
        return res.status(400).json({ error: "surname is required", code: "MISSING_FIELD" });
      }

      if (!phone || phone.trim() === "") {
        return res.status(400).json({ error: "phone is required", code: "MISSING_FIELD" });
      }

      if (!roomNumber || roomNumber.trim() === "") {
        return res.status(400).json({ error: "roomNumber is required", code: "MISSING_FIELD" });
      }

      if (!checkoutDate || isNaN(new Date(checkoutDate).getTime())) {
        return res.status(400).json({
          error: "checkoutDate is required and must be a valid date", code: "MISSING_FIELD"
        });
      }

      const checkout = new Date(checkoutDate);

      if (checkout <= new Date()) {
        return res.status(400).json({
          error: "checkoutDate must be in the future", code: "INVALID_DATE"
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 2 — PROPERTY FROM TOKEN
      //////////////////////////////////////////////////////////

      const propertyId = req.user.propertyId;

      //////////////////////////////////////////////////////////
      // STEP 3 — FIND THE PERMANENT ROOM RECORD
      // Room must exist — admin sets up rooms during onboarding
      //////////////////////////////////////////////////////////

      const room = await prisma.room.findFirst({
        where: {
          propertyId,
          roomNumber: roomNumber.trim(),
          isActive: true,
        },
      });

      if (!room) {
        return res.status(404).json({
          error: `Room ${roomNumber} not found. Admin must create this room first.`,
          code: "ROOM_NOT_FOUND",
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 4 — CHECK ROOM NOT ALREADY OCCUPIED
      //////////////////////////////////////////////////////////

      const existingSession = await prisma.guestSession.findFirst({
        where: {
          roomId: room.id,
          status: "active",
          expiresAt: { gt: new Date() },
        },
      });

      if (existingSession) {
        return res.status(409).json({
          error: `Room ${roomNumber} already has an active guest. Check out existing guest first.`,
          code: "ROOM_OCCUPIED",
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 5 — ATOMIC TRANSACTION
      //////////////////////////////////////////////////////////

      const result = await prisma.$transaction(async (tx) => {

        //////////////////////////////////////////////////////////
        // CREATE BOOKING
        //////////////////////////////////////////////////////////

        const booking = await tx.booking.create({
          data: {
            propertyId,
            firstName: firstName.trim(),
            surname: surname.trim(),
            phone: phone.trim(),
            roomNumber: roomNumber.trim(),
            roomId: room.id, 
            status: "confirmed",
            paymentStatus: "pending",
            checkoutDate: checkout,
          },
        });

        //////////////////////////////////////////////////////////
        // CREATE GUEST SESSION — LINKED TO PERMANENT ROOM
        // The QR token stays on the Room record
        // Session just references which room
        //////////////////////////////////////////////////////////

        const session = await tx.guestSession.create({
          data: {
            propertyId,
            roomId: room.id,
            firstName: firstName.trim(),
            surname: surname.trim(),
            phone: phone.trim(),
            roomNumber: roomNumber.trim(),
            bookingId: booking.id,
            status: "active",
            expiresAt: checkout,
          },
        });

        //////////////////////////////////////////////////////////
        // CREATE GUEST USER ACCOUNT (INTERNAL — NEVER SEEN)
        //////////////////////////////////////////////////////////

        const guestEmail =
          `guest_${session.phone}_prop${session.propertyId}@riccdigital.internal`;

        let guestUser = await tx.user.findFirst({
          where: { email: guestEmail },
        });

        if (!guestUser) {
          const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;
          const hashedPassword = await bcrypt.hash(
          crypto.randomBytes(16).toString("hex"),
          rounds
          );

          guestUser = await tx.user.create({
            data: {
              name: `${firstName.trim()} ${surname.trim()}`,
              email: guestEmail,
              password: hashedPassword,
              role: "GUEST",
              propertyId,
            },
          });
        } else {
          guestUser = await tx.user.update({
            where: { id: guestUser.id },
            data: {
              name: `${firstName.trim()} ${surname.trim()}`,
              propertyId,
            },
          });
        }

        return { booking, session, guestUser };
      });

      console.log(
        `📅 Check-in | Room: ${roomNumber} | Guest: ${firstName} ${surname} | Checkout: ${checkoutDate}`
      );

      //////////////////////////////////////////////////////////
      // STEP 6 — RESPONSE
      // QR URL already exists permanently on the room
      // Just confirm which room the guest is linked to
      //////////////////////////////////////////////////////////

      res.status(201).json({
        message: `${firstName} checked in to Room ${roomNumber}. Guest can now scan the room QR to access services.`,
        booking: result.booking,
        session: {
          id: result.session.id,
          roomNumber: result.session.roomNumber,
          expiresAt: result.session.expiresAt,
        },
        roomQr: {
          url: `${process.env.APP_URL}/g/room/${room.roomToken}`,
          note: "This QR is already in the room. No printing needed.",
        },
      });

    } catch (error) {
      console.error("❌ Create booking error:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  }
);

//////////////////////////////////////////////////////////
// 🔓 GUEST ROOM QR ACCESS — PUBLIC ENDPOINT
// GET /api/bookings/room-access/:roomToken
//
// Guest scans permanent QR on wall/card/fridge
// URL: www.hotela.com/g/room/<roomToken>
//
// System looks up: who is currently in this room?
// Issues JWT for that guest silently.
// Guest sees dashboard immediately.
//////////////////////////////////////////////////////////

router.get("/room-access/:roomToken", async (req, res) => {
  try {

    const { roomToken } = req.params;

    //////////////////////////////////////////////////////////
    // FIND THE ROOM BY PERMANENT TOKEN
    //////////////////////////////////////////////////////////

    const room = await prisma.room.findFirst({
      where: {
        roomToken,
        isActive: true,
      },
    });

    if (!room) {
      return res.status(404).json({
        error: "Room not found. Please contact front desk.",
        code: "ROOM_NOT_FOUND",
      });
    }

    //////////////////////////////////////////////////////////
    // FIND ACTIVE GUEST SESSION FOR THIS ROOM
    //////////////////////////////////////////////////////////

    const session = await prisma.guestSession.findFirst({
      where: {
        roomId: room.id,
        status: "active",
        expiresAt: { gt: new Date() },
      },
      include: { booking: true },
    });

    //////////////////////////////////////////////////////////
    // NO ACTIVE GUEST — ROOM IS EMPTY OR NOT CHECKED IN
    //////////////////////////////////////////////////////////

    if (!session) {
      return res.status(403).json({
        error: "No active booking found for this room. Please contact front desk.",
        code: "NO_ACTIVE_SESSION",
      });
    }

    //////////////////////////////////////////////////////////
    // FIND GUEST USER ACCOUNT
    //////////////////////////////////////////////////////////

    const guestUser = await prisma.user.findFirst({
      where: {
        email: guestEmail,
        role: "GUEST",
    },
    });

    if (!guestUser) {
      return res.status(404).json({
        error: "Guest account not found. Please contact front desk.",
        code: "GUEST_NOT_FOUND",
      });
    }

    //////////////////////////////////////////////////////////
    // ISSUE JWT SILENTLY
    //////////////////////////////////////////////////////////

    const token = generateToken(guestUser);

    console.log(
      `🔓 QR Access | Room: ${room.roomNumber} | Guest: ${guestUser.id} | Property: ${room.propertyId}`
    );

    //////////////////////////////////////////////////////////
    // RESPONSE — frontend stores JWT, loads dashboard
    //////////////////////////////////////////////////////////
    const now           = new Date();
    const msUntilCheckout = session.expiresAt.getTime() - now.getTime();
    const daysUntilCheckout = Math.ceil(msUntilCheckout / (1000 * 60 * 60 * 24));

    res.json({
      message: `Welcome to Room ${room.roomNumber}.`,
      token,
      guest: safeUser(guestUser),
      room: {
        roomNumber:       room.roomNumber,
        floor:            room.floor,
        roomType:         room.roomType,
        propertyId:       room.propertyId,
        checkoutDate:     session.expiresAt,
        daysUntilCheckout,
      },
    });

  } catch (error) {
    console.error("❌ Room access error:", error);
    res.status(500).json({ error: "Failed to authenticate room access" });
  }
});

//////////////////////////////////////////////////////////
// 🔍 SESSION CHECK — STAFF/ADMIN
// GET /api/bookings/check
//////////////////////////////////////////////////////////

router.get("/check",
  authenticate,
  authorizeRoles("ADMIN", "STAFF"),
  async (req, res) => {
    try {

      const { roomNumber } = req.query;

      if (!roomNumber) {
        return res.status(400).json({ error: "roomNumber is required", code: "MISSING_FIELD" });
      }

      const propertyId = req.user.propertyId;

      const session = await prisma.guestSession.findFirst({
        where: {
          propertyId,
          roomNumber: String(roomNumber),
          status: "active",
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
        include: { booking: true },
      });

      if (!session) {
        return res.json({ active: false, session: null });
      }

      res.json({
        active: true,
        session: {
          id: session.id,
          roomNumber: session.roomNumber,
          firstName: session.firstName,
          surname: session.surname,
          expiresAt: session.expiresAt,
          booking: session.booking,
        },
      });

    } catch (error) {
      console.error("❌ Session check error:", error);
      res.status(500).json({ error: "Failed to check session" });
    }
  }
);

//////////////////////////////////////////////////////////
// 📋 GET ALL BOOKINGS — ADMIN VIEW
// GET /api/bookings
//////////////////////////////////////////////////////////

router.get("/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const filters = getPropertyFilter(req.user);

      const { status } = req.query;

      if (status) {
        if (!BOOKING_STATUSES.includes(status)) {
          return res.status(400).json({
            error: "Invalid status filter",
            allowedStatuses: BOOKING_STATUSES,
          });
        }
        filters.status = status;
      }

      const bookings = await prisma.booking.findMany({
        where: filters,
        orderBy: { createdAt: "desc" },
      });

      res.json({ bookings, total: bookings.length });

    } catch (error) {
      console.error("❌ Fetch bookings error:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  }
);

//////////////////////////////////////////////////////////
// 📋 GET ALL ROOMS — ADMIN VIEW
// GET /api/bookings/rooms
//////////////////////////////////////////////////////////

router.get("/rooms",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const propertyId =
        req.user.role === "ADMIN" ? req.user.propertyId : undefined;

      const rooms = await prisma.room.findMany({
        where: propertyId ? { propertyId } : {},
        include: {
          sessions: {
            where: {
              status: "active",
              expiresAt: { gt: new Date() },
            },
            take: 1,
          },
        },
        orderBy: { roomNumber: "asc" },
      });

      //////////////////////////////////////////////////////////
      // ADD OCCUPANCY STATUS TO EACH ROOM
      //////////////////////////////////////////////////////////

      const roomsWithStatus = rooms.map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        roomType: room.roomType,
        isActive: room.isActive,
        occupied: room.sessions.length > 0,
        currentGuest: room.sessions[0]
          ? {
              firstName: room.sessions[0].firstName,
              surname: room.sessions[0].surname,
              checkoutDate: room.sessions[0].expiresAt,
            }
          : null,
        qrUrl: `${process.env.APP_URL}/g/room/${room.roomToken}`,
      }));

      const occupied = roomsWithStatus.filter(r => r.occupied).length;
      const vacant   = roomsWithStatus.filter(r => !r.occupied).length;

      res.json({
        rooms: roomsWithStatus,
        summary: {
        total:    roomsWithStatus.length,
        occupied,
        vacant,
      },
    });

    } catch (error) {
      console.error("❌ Fetch rooms error:", error);
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  }
);

module.exports = router;