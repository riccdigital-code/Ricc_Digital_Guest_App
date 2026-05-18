//////////////////////////////////////////////////////////
// 📞 CALL ADMIN ROUTES
// Thin HTTP controller — all logic in callService
//
// ROUTES:
//   GET    /             — all calls dashboard
//   GET    /stats        — operational statistics
//   GET    /:id          — single call detail
//   PATCH  /:id/reassign — reassign call task
//////////////////////////////////////////////////////////

const express = require("express");
const router  = express.Router();

const authenticate   = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getCalls,
  getCallById,
  getCallStats,
  reassignCallTask,
} = require("../services/callService");

//////////////////////////////////////////////////////////
// GET / — ALL CALLS — ADMIN DASHBOARD
// Filters: callType, unresolved
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

      console.error("❌ Fetch calls error:", error);
      res.status(500).json({ error: "Failed to fetch calls" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET /stats — CALL STATISTICS
// Must be registered BEFORE /:id to avoid route conflict
//////////////////////////////////////////////////////////

router.get("/stats",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const { stats } = await getCallStats(req.user);

      res.json({ stats });

    } catch (error) {
      console.error("❌ Call stats error:", error);
      res.status(500).json({ error: "Failed to fetch call stats" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET /:id — SINGLE CALL DETAIL
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
// PATCH /:id/reassign — REASSIGN CALL TASK
// Admin manually overrides automatic routing
//////////////////////////////////////////////////////////

router.patch("/:id/reassign",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const callId      = Number(req.params.id);
      const { assignedToId } = req.body;

      if (!Number.isFinite(callId) || callId <= 0) {
        return res.status(400).json({
          error: "Invalid call ID",
          code:  "INVALID_ID",
        });
      }

      if (!assignedToId || typeof assignedToId !== "number") {
        return res.status(400).json({
          error: "assignedToId is required and must be a number",
        });
      }

      const io           = req.app.get("io");
      const { task }     = await reassignCallTask(
        callId,
        assignedToId,
        req.user,
        io
      );

      res.json({
        message: "Call task reassigned successfully",
        task,
      });

    } catch (error) {

      if (error.message === "Call not found") {
        return res.status(404).json({
          error: error.message,
          code:  "NOT_FOUND",
        });
      }

      if (error.message === "No task found for this call") {
        return res.status(404).json({
          error: error.message,
          code:  "TASK_NOT_FOUND",
        });
      }

      if (error.code === "FORBIDDEN") {
        return res.status(403).json({
          error: error.message,
          code:  "FORBIDDEN",
        });
      }

      if (error.code === "INVALID_STAFF_ROLE" || error.code === "WRONG_PROPERTY") {
        return res.status(400).json({
          error: error.message,
          code:  error.code,
        });
      }

      console.error("❌ Reassign call error:", error);
      res.status(500).json({ error: "Failed to reassign call task" });
    }
  }
);

module.exports = router;