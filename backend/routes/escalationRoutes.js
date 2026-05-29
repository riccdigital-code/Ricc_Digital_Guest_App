//////////////////////////////////////////////////////////
// 🚨 ESCALATION ROUTES
// Operational escalation management
//
// PURPOSE:
//   Returns escalated operational tasks
//   for Hotel Admins and Super Admins
//
// ROUTES:
//   GET /api/escalations
//////////////////////////////////////////////////////////

const express = require('express');
const router  = express.Router();

const prisma         = require("../prismaClient");
const authenticate   = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  TASK_STATUSES,
} = require("../constants/taskStatuses");

const {
  getPropertyFilter,
} = require("../utils/scopeByRole");

//////////////////////////////////////////////////////////
// GET /api/escalations
//
// SUPER_ADMIN:
//   sees escalations across all properties
//
// ADMIN:
//   sees escalations only in own property
//////////////////////////////////////////////////////////

router.get("/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {

    try {

      //////////////////////////////////////////////////////
      // PROPERTY SCOPING
      //////////////////////////////////////////////////////

      const propertyFilter = getPropertyFilter(req.user);

      //////////////////////////////////////////////////////
      // FETCH ESCALATED TASKS
      //////////////////////////////////////////////////////

      const escalations = await prisma.task.findMany({

        where: {
          ...propertyFilter,
          status: TASK_STATUSES.ESCALATED,
        },

        include: {

          //////////////////////////////////////////////////
          // ASSIGNED STAFF
          //////////////////////////////////////////////////

          assignedTo: {
            select: {
              id:    true,
              name:  true,
              email: true,
            },
          },

          //////////////////////////////////////////////////
          // PROPERTY INFO
          //////////////////////////////////////////////////

          property: {
            select: {
              id:   true,
              name: true,
            },
          },
        },

        ////////////////////////////////////////////////////
        // NEWEST FIRST
        ////////////////////////////////////////////////////

        orderBy: {
          updatedAt: "desc",
        },
      });

      //////////////////////////////////////////////////////
      // RESPONSE
      //////////////////////////////////////////////////////

      res.json({
        escalations,
        total: escalations.length,
      });

    } catch (error) {

      console.error("❌ Escalation fetch error:", error);

      res.status(500).json({
        error: "Failed to fetch escalations",
      });
    }
  }
);

module.exports = router;
