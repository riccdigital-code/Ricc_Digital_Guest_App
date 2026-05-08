const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");

/**
 * CHECK SESSION (already working)
 */
router.post("/check", async (req, res) => {
  try {
    const { roomNumber, propertyId } = req.body;

    const session = await prisma.guestSession.findFirst({
      where: {
        roomNumber,
        propertyId,
        status: "active",
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      console.log("⚠️ No active session");
      return res.json({ active: false, session: null });
    }

    console.log("✅ Active session found");
    res.json({ active: true, session });

  } catch (error) {
    console.error("❌ Error checking session:", error);
    res.status(500).json({ error: "Failed to check session" });
  }
});

/**
 * 🔥 EXTEND SESSION (NEW)
 */
router.post("/extend", async (req, res) => {
  try {
    const { roomNumber, propertyId, extraHours } = req.body;

    // Basic validation
    if (!roomNumber || !propertyId || !extraHours) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    // 1. Find active session
    const session = await prisma.guestSession.findFirst({
      where: {
        roomNumber,
        propertyId,
        status: "active",
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      console.log("❌ No active session to extend");
      return res.status(404).json({
        message: "No active session found",
      });
    }

    // 2. Calculate new expiry
    const newExpiry = new Date(
      session.expiresAt.getTime() + extraHours * 60 * 60 * 1000
    );

    // 3. Update session
    const updatedSession = await prisma.guestSession.update({
      where: { id: session.id },
      data: {
        expiresAt: newExpiry,
      },
    });

    console.log("🔥 Session extended:", updatedSession);

    res.json({
      message: "Session extended successfully",
      session: updatedSession,
    });

  } catch (error) {
    console.error("❌ Error extending session:", error);
    res.status(500).json({ error: "Failed to extend session" });
  }
});

module.exports = router;