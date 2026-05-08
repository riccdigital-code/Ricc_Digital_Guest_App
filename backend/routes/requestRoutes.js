const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");

/**
 * CREATE SERVICE REQUEST
 */
router.post("/", async (req, res) => {
  try {
    const { propertyId, roomNumber, requestType } = req.body;

    if (!propertyId || !roomNumber || !requestType) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    // 1. Create Request
    const request = await prisma.serviceRequest.create({
      data: {
        propertyId,
        roomNumber,
        requestType,
      },
    });

    // 2. Create Task (🔥 SAME ENGINE)
    const task = await prisma.task.create({
      data: {
        propertyId,
        itemName: requestType,
        requestId: request.id,
      },
    });

    console.log("🧹 Request:", request);
    console.log("📋 Task:", task);

    res.status(201).json({
      message: "Request created successfully",
      request,
      task,
    });

  } catch (error) {
    console.error("❌ Error creating request:", error);
    res.status(500).json({ error: "Failed to create request" });
  }
});

/**
 * GET ALL REQUESTS
 */
router.get("/", async (req, res) => {
  try {
    const requests = await prisma.serviceRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json(requests);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

module.exports = router;