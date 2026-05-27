//////////////////////////////////////////////////////////
// 👤 SESSION ROUTES
//////////////////////////////////////////////////////////

const express = require("express");
const router = express.Router();

const prisma = require("../prismaClient");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// ADD import at the top of the file
const { getPropertyFilter } = require("../utils/scopeByRole");

//////////////////////////////////////////////////////////
// EXTENSION LIMITS
// Prevents abuse of session extension
//////////////////////////////////////////////////////////

const MAX_EXTENSION_HOURS = 72;   // 3 days maximum per extension
const MIN_EXTENSION_HOURS = 1;    // minimum 1 hour

//////////////////////////////////////////////////////////
// 🔍 CHECK SESSION — STAFF/ADMIN ACTION
// GET /api/sessions/check?roomNumber=104
// Replaces old POST /check with proper GET + auth
// propertyId comes from token — not from body/query
//////////////////////////////////////////////////////////

router.get("/check",
  authenticate,
  authorizeRoles("ADMIN", "STAFF"),
  async (req, res) => {
    try {

      const { roomNumber } = req.query;

      if (!roomNumber || roomNumber.trim() === "") {
        return res.status(400).json({
          error: "roomNumber is required as a query parameter",
        });
      }

      //////////////////////////////////////////////////////////
      // PROPERTY FROM TOKEN — not from request
      //////////////////////////////////////////////////////////

      const propertyId = req.user.propertyId;

      const session = await prisma.guestSession.findFirst({
        where: {
          roomNumber: String(roomNumber),
          propertyId,
          status: "active",
          expiresAt: { gt: new Date() },
        },
        include: {
          booking: {
            select: {
              id: true,
              checkInDate: true,
              checkoutDate: true,
              status: true,
              paymentStatus: true,
            },
          },
          room: {
            select: {
              id: true,
              roomNumber: true,
              floor: true,
              roomType: true,
            },
          },
        },
      });

      if (!session) {
        return res.json({
          active: false,
          session: null,
        });
      }

      //////////////////////////////////////////////////////////
      // RETURN SAFE SESSION — no sensitive fields exposed
      //////////////////////////////////////////////////////////

      res.json({
        active: true,
        session: {
          id: session.id,
          roomNumber: session.roomNumber,
          firstName: session.firstName,
          surname: session.surname,
          status: session.status,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          booking: session.booking,
          room: session.room,
        },
      });

    } catch (error) {
      console.error("❌ Session check error:", error);
      res.status(500).json({ error: "Failed to check session" });
    }
  }
);

//////////////////////////////////////////////////////////
// ⏳ EXTEND SESSION — ADMIN ACTION
// PATCH /api/sessions/:id/extend
// Admin extends a guest's stay
// Updates BOTH session and booking for consistency
//////////////////////////////////////////////////////////

router.patch("/:id/extend",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const sessionId = Number(req.params.id);
      const { extraHours } = req.body;

      //////////////////////////////////////////////////////////
      // VALIDATE extraHours
      //////////////////////////////////////////////////////////

      if (extraHours === undefined || extraHours === null) {
        return res.status(400).json({
          error: "extraHours is required",
        });
      }

      if (typeof extraHours !== "number" || !Number.isInteger(extraHours)) {
        return res.status(400).json({
          error: "extraHours must be a whole number",
        });
      }

      if (extraHours < MIN_EXTENSION_HOURS) {
        return res.status(400).json({
          error: `Minimum extension is ${MIN_EXTENSION_HOURS} hour`, code: "BELOW_MIN_HOURS"
        });
      }

      if (extraHours > MAX_EXTENSION_HOURS) {
        return res.status(400).json({
          error: `Maximum extension is ${MAX_EXTENSION_HOURS} hours (${MAX_EXTENSION_HOURS / 24} days) per request`, code: "ABOVE_MAX_HOURS"
        });
      }

      //////////////////////////////////////////////////////////
      // FIND SESSION BY ID
      //////////////////////////////////////////////////////////

      const session = await prisma.guestSession.findUnique({
        where: { id: sessionId },
        include: { booking: true },
      });

      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          code: "SESSION_NOT_FOUND",
        });
      }

      //////////////////////////////////////////////////////////
      // PROPERTY ISOLATION
      //////////////////////////////////////////////////////////

      if (
        req.user.role === "ADMIN" &&
        session.propertyId !== req.user.propertyId
      ) {
        return res.status(403).json({
          error: "You can only manage sessions from your property",
          code: "FORBIDDEN",
        });
      }

      //////////////////////////////////////////////////////////
      // VERIFY SESSION IS STILL ACTIVE
      //////////////////////////////////////////////////////////

      if (session.status !== "active") {
        return res.status(400).json({
          error: "Cannot extend an inactive or closed session",
          code: "SESSION_NOT_ACTIVE",
        });
      }

      if (session.expiresAt <= new Date()) {
        return res.status(400).json({
          error: "Cannot extend an already expired session",
          code: "SESSION_EXPIRED",
        });
      }

      //////////////////////////////////////////////////////////
      // CALCULATE NEW EXPIRY
      //////////////////////////////////////////////////////////

      const newExpiry = new Date(
        session.expiresAt.getTime() + extraHours * 60 * 60 * 1000
      );

      //////////////////////////////////////////////////////////
      // ATOMIC UPDATE — session + booking stay in sync
      //////////////////////////////////////////////////////////

      const [updatedSession, updatedBooking] = await prisma.$transaction([

        prisma.guestSession.update({
          where: { id: sessionId },
          data: { expiresAt: newExpiry },
        }),

        //////////////////////////////////////////////////////////
        // UPDATE BOOKING checkoutDate IF LINKED
        // Keeps booking and session consistent
        //////////////////////////////////////////////////////////

        ...(session.bookingId
          ? [
              prisma.booking.update({
                where: { id: session.bookingId },
                data: { checkoutDate: newExpiry },
              }),
            ]
          : []),
      ]);

      console.log(
        `⏳ Session ${sessionId} extended by ${extraHours}h | New expiry: ${newExpiry} | Admin: ${req.user.id}`
      );

      res.json({
        message: `Session extended by ${extraHours} hour(s)`,
        session: {
          id: updatedSession.id,
          roomNumber: updatedSession.roomNumber,
          expiresAt: updatedSession.expiresAt,
        },
        booking: updatedBooking
          ? {
              id: updatedBooking.id,
              checkoutDate: updatedBooking.checkoutDate,
            }
          : null,
      });

    } catch (error) {
      console.error("❌ Extend session error:", error);
      res.status(500).json({ error: "Failed to extend session" });
    }
  }
);

//////////////////////////////////////////////////////////
// 🚪 CLOSE SESSION — ADMIN ACTION (CHECKOUT)
// PATCH /api/sessions/:id/close
// Admin checks out a guest — clears room for next booking
// QR scan will return NO_ACTIVE_SESSION after this
//////////////////////////////////////////////////////////

router.patch("/:id/close",
  authenticate,
  authorizeRoles("ADMIN", "STAFF"),
  async (req, res) => {
    try {

      const sessionId = Number(req.params.id);

      const session = await prisma.guestSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          code: "SESSION_NOT_FOUND",
        });
      }

      if (
        req.user.role === "ADMIN" &&
        session.propertyId !== req.user.propertyId
      ) {
        return res.status(403).json({
          error: "You can only close sessions from your property",
          code: "FORBIDDEN",
        });
      }

      if (session.status === "inactive") {
        return res.status(400).json({
          error: "Session is already closed",
          code: "SESSION_ALREADY_CLOSED",
        });
      }

      //////////////////////////////////////////////////////////
      // CLOSE SESSION + UPDATE BOOKING STATUS
      //////////////////////////////////////////////////////////

      await prisma.$transaction([

        prisma.guestSession.update({
          where: { id: sessionId },
          data: {
            status: "inactive",
            expiresAt: new Date(), // expire immediately
          },
        }),

        ...(session.bookingId
          ? [
              prisma.booking.update({
                where: { id: session.bookingId },
                data: { status: "checked_out" },
              }),
            ]
          : []),
      ]);

      console.log(
        `🚪 Session ${sessionId} closed | Room: ${session.roomNumber} | By: ${req.user.id}`
      );

      res.json({
        message: `Guest checked out. Room ${session.roomNumber} is now available.`,
        roomNumber: session.roomNumber,
      });

    } catch (error) {
      console.error("❌ Close session error:", error);
      res.status(500).json({ error: "Failed to close session" });
    }
  }
);

//////////////////////////////////////////////////////////
// 📋 GET ALL SESSIONS — ADMIN VIEW
// GET /api/sessions
// Admin views all sessions for their property
//////////////////////////////////////////////////////////

router.get("/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const propertyFilter = getPropertyFilter(req.user);

      const { status } = req.query;

      // ✅ Validate status filter
      const validStatuses = ["active", "inactive"];

      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          error: "Invalid status filter",
          code: "INVALID_STATUS",
          message: `Status must be one of: ${validStatuses.join(", ")}`,
          validStatuses
        });
      }

      const sessions = await prisma.guestSession.findMany({
        where: {
          ...propertyFilter,
          ...(status && { status }),
        },
        select: {
          id: true,
          roomNumber: true,
          firstName: true,
          surname: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          booking: {
            select: {
              id: true,
              paymentStatus: true,
              checkoutDate: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ sessions, total: sessions.length });

    } catch (error) {
      console.error("❌ Fetch sessions error:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  }
);

module.exports = router;