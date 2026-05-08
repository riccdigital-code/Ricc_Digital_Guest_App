const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");

/**
 * CREATE ORDER
 */
router.post("/", async (req, res) => {
  try {
    const { propertyId, roomNumber, items } = req.body;

    if (!propertyId || !roomNumber || !items || items.length === 0) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const order = await prisma.order.create({
      data: {
        propertyId,
        roomNumber,
      },
    });

    for (const item of items) {
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          serviceItemId: item.serviceItemId,
          quantity: item.quantity,
        },
      });

      //////////////////////////////////////////////////////////
// 🔥 CREATE TASK (WITH REAL ITEM NAME)
//////////////////////////////////////////////////////////

// 1. Get actual service item (source of truth)
const serviceItem = await prisma.serviceItem.findUnique({
  where: { id: item.serviceItemId },
});

// 2. Create task using real name
await prisma.task.create({
  data: {
    propertyId,

    //////////////////////////////////////////////////////////
    // ✅ CRITICAL FIX
    //////////////////////////////////////////////////////////
    itemName: serviceItem.name, // <-- THIS FIXES YOUR ERROR

    orderItemId: orderItem.id,
  },
});
    }

    console.log("🔥 Order created:", order);

    res.status(201).json({
      message: "Order created successfully",
      order,
    });

  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

/**
 * 🔍 GET TASKS (MUST BE BEFORE EXPORT)
 */
router.get("/tasks", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
    });

    console.log("📋 Tasks:", tasks);

    res.json(tasks);

  } catch (error) {
    console.error("❌ Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

module.exports = router;