const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");
const authenticate = require("../middleware/authMiddleware");



/**
 * GET ALL TASKS
 */
router.get("/", async (req, res) => {
  try {
    const { status, assignedToId } = req.query;

    const filters = {};

    //////////////////////////////////////////////////////////
    // FILTER BY STATUS
    //////////////////////////////////////////////////////////
    if (status) {
      filters.status = status;
    }

    //////////////////////////////////////////////////////////
    // FILTER BY STAFF
    //////////////////////////////////////////////////////////
    if (assignedToId) {
      filters.assignedToId = Number(assignedToId);
    }

    const tasks = await prisma.task.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
    });

    res.json(tasks);

  } catch (error) {
    console.error("❌ Fetch error:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

/**
 * UPDATE TASK STATUS (CORE ENGINE)
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // validation
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const validStatuses = ["pending", "in_progress", "completed"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: { status },
    });

    console.log("🔄 Task updated:", task);

    res.json({
      message: "Task status updated",
      task,
    });

  } catch (error) {
    console.error("❌ Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

/**
 * ASSIGN TASK TO STAFF
 */
router.patch("/:id/assign", async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    if (!assignedToId) {
      return res.status(400).json({
        message: "assignedToId is required",
      });
    }

    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: { assignedToId },
    });

    res.json({
      message: "Task assigned successfully",
      task,
    });

  } catch (error) {
    console.error("❌ Assign error:", error);
    res.status(500).json({ error: "Failed to assign task" });
  }
});

/**
 * GET MY TASKS (STAFF DASHBOARD)
 */
router.get("/my-tasks", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        assignedToId: userId,
        ...(status && { status }), // ✅ clean optional filter
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(tasks);

  } catch (error) {
    console.error("❌ My tasks error:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

//////////////////////////////////////////////////////////
// 📊 GET MY TASK STATS
//////////////////////////////////////////////////////////
router.get("/my-stats", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    //////////////////////////////////////////////////////////
    // COUNT TASKS BY STATUS
    //////////////////////////////////////////////////////////
    const total = await prisma.task.count({
      where: { assignedToId: userId },
    });

    const pending = await prisma.task.count({
      where: {
        assignedToId: userId,
        status: "pending",
      },
    });

    const inProgress = await prisma.task.count({
      where: {
        assignedToId: userId,
        status: "in_progress",
      },
    });

    const completed = await prisma.task.count({
      where: {
        assignedToId: userId,
        status: "completed",
      },
    });

    //////////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////////
    res.json({
      total,
      pending,
      in_progress: inProgress,
      completed,
    });

  } catch (error) {
    console.error("❌ My stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;