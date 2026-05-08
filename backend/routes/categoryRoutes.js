const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");

//////////////////////////////////////////////////////////
// 🗂️ CREATE CATEGORY
//////////////////////////////////////////////////////////

router.post("/", async (req, res) => {
  try {
    const { propertyId, name } = req.body;

    const category = await prisma.serviceCategory.create({
      data: {
        propertyId,
        name,
      },
    });

    res.status(201).json(category);

  } catch (error) {
    console.error("❌ Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

//////////////////////////////////////////////////////////
// 📋 GET ALL CATEGORIES
//////////////////////////////////////////////////////////

router.get("/", async (req, res) => {
  try {
    const categories = await prisma.serviceCategory.findMany({
      include: {
        items: true,
      },
    });

    res.json(categories);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

module.exports = router;