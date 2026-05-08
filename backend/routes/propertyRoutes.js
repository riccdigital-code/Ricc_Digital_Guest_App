const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");

//////////////////////////////////////////////////////////
// 🏢 CREATE PROPERTY (SUPER ADMIN SETUP)
//////////////////////////////////////////////////////////

router.post("/", async (req, res) => {
  try {
    const { name, ownerId } = req.body;

    // Validation
    if (!name || !ownerId) {
      return res.status(400).json({
        error: "Name and ownerId are required",
      });
    }

    const property = await prisma.property.create({
      data: {
        name,
        ownerId,
      },
    });

    console.log("🏢 Property created:", property);

    res.status(201).json({
      message: "Property created",
      property,
    });

  } catch (error) {
    console.error("❌ Error creating property:", error);
    res.status(500).json({ error: "Failed to create property" });
  }
});

module.exports = router;