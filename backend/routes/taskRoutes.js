//////////////////////////////////////////////////////////
// 📋 TASK ROUTES
// Task lifecycle management
//
// ROUTES:
//   POST   /           — create task (ADMIN/SUPER_ADMIN)
//   GET    /           — list tasks (ADMIN/SUPER_ADMIN)
//   GET    /my-tasks   — staff dashboard (STAFF)
//   GET    /my-stats   — staff statistics (STAFF)
//   GET    /:id        — single task (ADMIN/SUPER_ADMIN/STAFF)
//   PATCH  /:id/status — update status (STAFF)
//   PATCH  /:id/assign — assign to staff (ADMIN/SUPER_ADMIN)
//////////////////////////////////////////////////////////

const express = require("express");
const router  = express.Router();

const prisma         = require("../prismaClient");
const authenticate   = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { validate }   = require("../middleware/validate");
const { getPropertyFilter, canAccessProperty, forbiddenResponse } =
  require("../utils/scopeByRole");
const {
  validateStatusTransition,
} = require("../utils/taskTransitions");

const {
  updateTaskStatusSchema,
  assignTaskSchema,
} = require("../validators/taskValidator");

const { notifyTaskUpdated, notifyTaskReassigned } =
  require("../services/socketService");

const {
  TASK_STATUSES,
} = require("../constants/taskStatuses");

const { PRIORITIES } = require("../constants/priorities");

//////////////////////////////////////////////////////////
// POST / — CREATE TASK
// Admin creates a standalone task
//////////////////////////////////////////////////////////

router.post("/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const { itemName, priority, assignedToId } = req.body;

      if (!itemName || typeof itemName !== "string" || !itemName.trim()) {
        return res.status(400).json({
          error: "itemName is required",
          code:  "MISSING_ITEM_NAME",
        });
      }

      //////////////////////////////////////////////////////////
      // PROPERTY FROM TOKEN
      //////////////////////////////////////////////////////////

      const propertyId = req.user.propertyId;

      const task = await prisma.task.create({
        data: {
          propertyId,
          itemName:     itemName.trim(),
          status:       TASK_STATUSES.PENDING,
          priority:     PRIORITIES[priority?.toUpperCase()] || PRIORITIES.NORMAL,
          assignedToId: assignedToId || null,
        },
      });

      const io = req.app.get("io");
      notifyTaskUpdated(io, task);

      console.log(
        `📋 Task ${task.id} created | Property: ${propertyId} | Assigned: ${assignedToId || "UNASSIGNED"}`
      );

      res.status(201).json({
        message: "Task created successfully",
        task,
      });

    } catch (error) {
      console.error("❌ Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET / — LIST ALL TASKS
//////////////////////////////////////////////////////////

router.get("/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const propertyFilter = getPropertyFilter(req.user);
      const filters        = { ...propertyFilter };

      if (req.query.status) {
        const status = req.query.status.toLowerCase();
        if (!Object.values(TASK_STATUSES).includes(status)) {
          return res.status(400).json({
            error:         "Invalid status filter",
            code:          "INVALID_STATUS",
            allowedValues: Object.values(TASK_STATUSES),
          });
        }
        filters.status = status;
      }

      if (req.query.priority) {
        const priority = req.query.priority.toLowerCase();
        if (!Object.values(PRIORITIES).includes(priority)) {
          return res.status(400).json({
            error:         "Invalid priority filter",
            code:          "INVALID_PRIORITY",
            allowedValues: Object.values(PRIORITIES),
          });
        }
        filters.priority = priority;
      }

      if (req.query.assignedToId) {
        const staffId = Number(req.query.assignedToId);
        if (!Number.isFinite(staffId) || staffId <= 0) {
          return res.status(400).json({
            error: "Invalid assignedToId",
            code:  "INVALID_STAFF_ID",
          });
        }
        filters.assignedToId = staffId;
      }

      const tasks = await prisma.task.findMany({
        where:   filters,
        orderBy: { createdAt: "desc" },
        include: {
          assignedTo: {
            select: { id: true, name: true, role: true },
          },
        },
      });

      res.json({ tasks, total: tasks.length });

    } catch (error) {
      console.error("❌ List tasks error:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET /my-tasks — STAFF DASHBOARD
// Must be registered BEFORE GET /:id
//////////////////////////////////////////////////////////

router.get("/my-tasks",
  authenticate,
  authorizeRoles("STAFF"),
  async (req, res) => {
    try {

      const where = { assignedToId: req.user.id };

      if (req.query.status) {
        const status = req.query.status.toLowerCase();
        if (!Object.values(TASK_STATUSES).includes(status)) {
          return res.status(400).json({
            error:         "Invalid status filter",
            code:          "INVALID_STATUS",
            allowedValues: Object.values(TASK_STATUSES),
          });
        }
        where.status = status;
      }

      const tasks = await prisma.task.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      res.json({ tasks, total: tasks.length });

    } catch (error) {
      console.error("❌ Fetch my tasks error:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET /my-stats — STAFF STATISTICS
// Must be registered BEFORE GET /:id
//////////////////////////////////////////////////////////

router.get("/my-stats",
  authenticate,
  authorizeRoles("STAFF"),
  async (req, res) => {
    try {

      const grouped = await prisma.task.groupBy({
        by:    ["status"],
        where: { assignedToId: req.user.id },
        _count: { status: true },
      });

      //////////////////////////////////////////////////////////
      // NORMALISE — all status keys present, lowercase values
      //////////////////////////////////////////////////////////

      const stats = { total: 0 };
      for (const status of Object.values(TASK_STATUSES)) {
        stats[status] = 0;
      }

      for (const group of grouped) {
        stats[group.status] = group._count.status;
        stats.total        += group._count.status;
      }

      res.json({ stats });

    } catch (error) {
      console.error("❌ Fetch stats error:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET /:id — SINGLE TASK
//////////////////////////////////////////////////////////

router.get("/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN", "STAFF"),
  async (req, res) => {
    try {

      const taskId = Number(req.params.id);

      if (!Number.isFinite(taskId) || taskId <= 0) {
        return res.status(400).json({ error: "Invalid task ID", code: "INVALID_ID" });
      }

      const task = await prisma.task.findUnique({
        where:   { id: taskId },
        include: {
          assignedTo: { select: { id: true, name: true, role: true } },
        },
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found", code: "NOT_FOUND" });
      }

      //////////////////////////////////////////////////////////
      // STAFF — only own tasks
      // ADMIN — only own property
      //////////////////////////////////////////////////////////

      if (req.user.role === "STAFF" && task.assignedToId !== req.user.id) {
        return forbiddenResponse(res, "You can only view tasks assigned to you");
      }

      if (
        req.user.role === "ADMIN" &&
        !canAccessProperty(req.user, task.propertyId)
      ) {
        return forbiddenResponse(res, "You can only view tasks in your property");
      }

      res.json({ task });

    } catch (error) {
      console.error("❌ Fetch task error:", error);
      res.status(500).json({ error: "Failed to fetch task" });
    }
  }
);

//////////////////////////////////////////////////////////
// PATCH /:id/status — UPDATE TASK STATUS
// STAFF only — enforces state machine transitions
//////////////////////////////////////////////////////////

router.patch("/:id/status",
  authenticate,
  authorizeRoles("STAFF"),
  validate(updateTaskStatusSchema),
  async (req, res) => {
    try {

      const taskId       = Number(req.params.id);
      const { status }   = req.validated;

      if (!Number.isFinite(taskId) || taskId <= 0) {
        return res.status(400).json({ error: "Invalid task ID", code: "INVALID_ID" });
      }

      const task = await prisma.task.findUnique({ where: { id: taskId } });

      if (!task) {
        return res.status(404).json({ error: "Task not found", code: "NOT_FOUND" });
      }

      if (task.assignedToId !== req.user.id) {
        return forbiddenResponse(res, "You can only update tasks assigned to you");
      }

      //////////////////////////////////////////////////////////
      // VALIDATE TRANSITION — state machine enforced
      //////////////////////////////////////////////////////////

      const currentStatus = task.status;
const transition    = validateStatusTransition(currentStatus, status);

if (!transition.valid) {
  return res.status(400).json(transition);
}

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data:  { status },
      });

      const io = req.app.get("io");
      notifyTaskUpdated(io, updatedTask);

      console.log(
        `🔄 Task ${taskId} | ${currentStatus} → ${status} | Staff: ${req.user.id}`
      );

      res.json({ message: "Task status updated", task: updatedTask });

    } catch (error) {
      console.error("❌ Update task status error:", error);
      res.status(500).json({ error: "Failed to update task status" });
    }
  }
);

//////////////////////////////////////////////////////////
// PATCH /:id/assign — ASSIGN TASK TO STAFF
//////////////////////////////////////////////////////////

router.patch("/:id/assign",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  validate(assignTaskSchema),
  async (req, res) => {
    try {

      const taskId         = Number(req.params.id);
      const { assignedToId } = req.validated;

      if (!Number.isFinite(taskId) || taskId <= 0) {
        return res.status(400).json({ error: "Invalid task ID", code: "INVALID_ID" });
      }

      const task = await prisma.task.findUnique({ where: { id: taskId } });

      if (!task) {
        return res.status(404).json({ error: "Task not found", code: "NOT_FOUND" });
      }

      if (!canAccessProperty(req.user, task.propertyId)) {
        return forbiddenResponse(res, "You can only assign tasks in your property");
      }

      const targetStaff = await prisma.user.findUnique({
        where: { id: assignedToId },
      });

      if (!targetStaff) {
        return res.status(404).json({
          error: "Staff member not found",
          code:  "STAFF_NOT_FOUND",
        });
      }

      if (targetStaff.role !== "STAFF") {
        return res.status(400).json({
          error: "Tasks can only be assigned to STAFF members",
          code:  "INVALID_ROLE",
        });
      }

      if (
        req.user.role === "ADMIN" &&
        targetStaff.propertyId !== req.user.propertyId
      ) {
        return forbiddenResponse(res, "You can only assign to staff in your property");
      }

      const previousAssigneeId = task.assignedToId;

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data:  { assignedToId },
      });

      const io = req.app.get("io");
      notifyTaskReassigned(io, updatedTask, previousAssigneeId);

      console.log(
        `📋 Task ${taskId} assigned | From: ${previousAssigneeId || "unassigned"} → To: ${assignedToId} | By: ${req.user.id}`
      );

      res.json({ message: "Task assigned successfully", task: updatedTask });

    } catch (error) {
      console.error("❌ Assign task error:", error);
      res.status(500).json({ error: "Failed to assign task" });
    }
  }
);

module.exports = router;