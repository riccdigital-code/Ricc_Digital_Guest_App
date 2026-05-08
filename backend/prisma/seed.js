//////////////////////////////////////////////////////////
// 🌱 DATABASE SEEDER
//////////////////////////////////////////////////////////

const prisma = require("../prismaClient");
const bcrypt = require("bcryptjs");

async function main() {
  //////////////////////////////////////////////////////////
  // HASH PASSWORD
  //////////////////////////////////////////////////////////

  const hashedPassword = await bcrypt.hash("123456", 10);

  //////////////////////////////////////////////////////////
  // CREATE SUPER ADMIN
  //////////////////////////////////////////////////////////

  const superAdmin = await prisma.user.upsert({
    where: {
      email: "superadmin@test.com",
    },

    update: {},

    create: {
      name: "Super Admin",
      email: "superadmin@test.com",
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });

  console.log("✅ Super Admin Seeded:", superAdmin.email);
}

//////////////////////////////////////////////////////////
// RUN SEED
//////////////////////////////////////////////////////////

main()
  .catch((error) => {
    console.error("❌ Seed Error:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });