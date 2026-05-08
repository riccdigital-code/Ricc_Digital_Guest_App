const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");

/**
 * =====================================
 * 1. CREATE BOOKING + SESSION (WORKING)
 * =====================================
 */
router.post("/", async (req, res) => {
  try {
    const { firstName, surname, phone, room, propertyId } = req.body;

    // Validation
    if (!firstName || !surname || !phone || !room) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    // Create Booking
    const booking = await prisma.booking.create({
      data: {
        propertyId: propertyId || 1,
        firstName,
        surname,
        phone,
        roomNumber: room,
        status: "confirmed",
        paymentStatus: "paid",
      },
    });

    // Create Session
    const session = await prisma.guestSession.create({
      data: {
        propertyId: propertyId || 1,
        firstName,
        surname,
        phone,
        roomNumber: room,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    console.log("🔥 Booking:", booking);
    console.log("🔥 Session:", session);

    res.status(201).json({
      message: "Booking + Session created",
      booking,
      session,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Failed to create booking/session" });
  }
});


/**
 * =====================================
 * 2. SESSION CHECK (NEW CORE LOGIC)
 * =====================================
 */
router.get("/check", async (req, res) => {
  try {
    const { roomNumber, propertyId } = req.query;

    if (!roomNumber) {
      return res.status(400).json({
        message: "roomNumber is required",
      });
    }

    const session = await prisma.guestSession.findFirst({
      where: {
        roomNumber: roomNumber,
        propertyId: propertyId ? Number(propertyId) : 1,
        status: "active",
        expiresAt: {
          gt: new Date(), // still valid
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!session) {
      return res.json({
        active: false,
        session: null,
      });
    }

    res.json({
      active: true,
      session,
    });

  } catch (error) {
    console.error("❌ Session check error:", error);
    res.status(500).json({ error: "Failed to check session" });
  }
});

module.exports = router;