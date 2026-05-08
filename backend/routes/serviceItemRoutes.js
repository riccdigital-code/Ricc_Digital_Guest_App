const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");

//////////////////////////////////////////////////////////
// 🍽️ CREATE SERVICE ITEM
//////////////////////////////////////////////////////////

router.post("/", async (req, res) => {
  try {
    const { propertyId, categoryId, name, price } = req.body;

    const item = await prisma.serviceItem.create({
      data: {
        propertyId,
        categoryId,
        name,
        price,
      },
    });

    res.status(201).json(item);

  } catch (error) {
    console.error("❌ Error creating item:", error);
    res.status(500).json({ error: "Failed to create item" });
  }
});

//////////////////////////////////////////////////////////
// 📋 GET ALL ITEMS
//////////////////////////////////////////////////////////

router.get("/", async (req, res) => {
  try {
    const items = await prisma.serviceItem.findMany();

    res.json(items);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

module.exports = router;