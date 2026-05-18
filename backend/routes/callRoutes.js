//////////////////////////////////////////////////////////
// 📞 CALL ROUTES
// Thin HTTP controller — all logic in callService
//
// ROUTES:
//   POST   /            — create call (GUEST)
//   GET    /            — list calls (ADMIN/SUPER_ADMIN)
//   GET    /:id         — single call (ADMIN/SUPER_ADMIN)
//   PATCH  /:id/status  — update status (ADMIN/SUPER_ADMIN)
//////////////////////////////////////////////////////////

const express = require("express");
const router  = express.Router();

const authenticate    = require("../middleware/authMiddleware");
const authorizeRoles  = require("../middleware/roleMiddleware");
const { validate }    = require("../middleware/validate");

const {
  createCallSchema,
  updateCallStatusSchema,
} = require("../validators/callValidator");

const {
  createCall,
  getCalls,
  getCallById,
} = require("../services/callService");

const { notifyTaskUpdated } = require("../services/socketService");
const prisma = require("../prismaClient");

//////////////////////////////////////////////////////////
// POST / — CREATE CALL
// GUEST only — a call comes from a guest in a room
//////////////////////////////////////////////////////////

router.post("/",
  authenticate,
  authorizeRoles("GUEST"),
  validate(createCallSchema),
  async (req, res) => {
    try {

      //////////////////////////////////////////////////////////
      // propertyId comes from JWT token — never from body
      // callService handles all orchestration:
      //   session verification → routing → transaction → notify
      //////////////////////////////////////////////////////////

      const io   = req.app.get("io");
      const data = await createCall(req.validated, req.user, io);

      res.status(201).json({
        message:    "Call logged and task created",
        call:       data.call,
        task:       data.task,
        assignment: data.assignment,
        routing:    data.routing,
      });

    } catch (error) {

      if (error.message === "Property not found") {
        return res.status(404).json({
          error: error.message,
          code:  "PROPERTY_NOT_FOUND",
        });
      }

      if (error.message === "No active booking found for this room") {
        return res.status(400).json({
          error: error.message,
          code:  "NO_ACTIVE_SESSION",
        });
      }

      console.error("❌ Create call error:", error);
      res.status(500).json({ error: "Failed to create call" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET / — LIST ALL CALLS
// ADMIN sees own property — SUPER_ADMIN sees all
//////////////////////////////////////////////////////////

router.get("/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const { calls, total } = await getCalls(req.user, {
        callType:   req.query.callType,
        status:     req.query.status,
        unresolved: req.query.unresolved,
      });

      res.json({ calls, total });

    } catch (error) {

      if (error.message?.startsWith("Invalid callType")) {
        return res.status(400).json({
          error: error.message,
          code:  "INVALID_CALL_TYPE",
        });
      }

      console.error("❌ List calls error:", error);
      res.status(500).json({ error: "Failed to fetch calls" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET /:id — SINGLE CALL
//////////////////////////////////////////////////////////

router.get("/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const callId = Number(req.params.id);

      if (!Number.isFinite(callId) || callId <= 0) {
        return res.status(400).json({
          error: "Invalid call ID",
          code:  "INVALID_ID",
        });
      }

      const { call } = await getCallById(callId, req.user);

      res.json({ call });

    } catch (error) {

      if (error.message === "Call not found") {
        return res.status(404).json({
          error: error.message,
          code:  "NOT_FOUND",
        });
      }

      if (error.code === "FORBIDDEN") {
        return res.status(403).json({
          error: error.message,
          code:  "FORBIDDEN",
        });
      }

      console.error("❌ Fetch call error:", error);
      res.status(500).json({ error: "Failed to fetch call" });
    }
  }
);

//////////////////////////////////////////////////////////
// PATCH /:id/status — UPDATE CALL STATUS
// Admin resolves, misses, or cancels a call
//////////////////////////////////////////////////////////

router.patch("/:id/status",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  validate(updateCallStatusSchema),
  async (req, res) => {
    try {

      const callId = Number(req.params.id);
      const { status } = req.validated;

      if (!Number.isFinite(callId) || callId <= 0) {
        return res.status(400).json({
          error: "Invalid call ID",
          code:  "INVALID_ID",
        });
      }

      const call = await prisma.callLog.findUnique({
        where: { id: callId },
      });

      if (!call) {
        return res.status(404).json({
          error: "Call not found",
          code:  "NOT_FOUND",
        });
      }

      if (
        req.user.role === "ADMIN" &&
        call.propertyId !== req.user.propertyId
      ) {
        return res.status(403).json({
          error: "You can only update calls in your property",
          code:  "FORBIDDEN",
        });
      }

      const updatedCall = await prisma.callLog.update({
        where: { id: callId },
        data:  { status },
      });

      console.log(
        `🔄 Call ${callId} | ${call.status} → ${status} | Admin: ${req.user.id}`
      );

      res.json({
        message: "Call status updated",
        call:    updatedCall,
      });

    } catch (error) {
      console.error("❌ Update call status error:", error);
      res.status(500).json({ error: "Failed to update call status" });
    }
  }
);

module.exports = router;