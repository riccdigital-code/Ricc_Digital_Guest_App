//////////////////////////////////////////////////////////
// 🏢 ADMIN PLATFORM ROUTES
// Super Admin platform analytics + executive metrics
//////////////////////////////////////////////////////////

const express = require("express");
const router = express.Router();

const prisma = require("../prismaClient");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

//////////////////////////////////////////////////////////
// GET /api/admin/platform/stats
// Executive platform overview
//////////////////////////////////////////////////////////

router.get(
  "/platform/stats",
  authenticate,
  authorizeRoles("SUPER_ADMIN"),
  async (req, res) => {
    try {

      //////////////////////////////////////////////////////
      // PARALLEL METRIC QUERIES
      //////////////////////////////////////////////////////

      const [
        totalProperties,
        totalAdmins,
        totalStaff,
        totalGuestSessions,
        unresolvedTasks,
        escalatedTasks,
      ] = await Promise.all([

        prisma.property.count(),

        prisma.user.count({
          where: {
            role: "ADMIN",
          },
        }),

        prisma.user.count({
          where: {
            role: "STAFF",
          },
        }),

        prisma.guestSession.count({
          where: {
            status: "active",
          },
        }),

        prisma.task.count({
          where: {
            status: {
              not: "completed",
            },
          },
        }),

        prisma.task.count({
          where: {
            status: "escalated",
          },
        }),

      ]);

      //////////////////////////////////////////////////////
      // RESPONSE
      //////////////////////////////////////////////////////

      res.json({
        stats: {
          totalProperties,
          totalAdmins,
          totalStaff,
          totalGuestSessions,
          unresolvedTasks,
          escalatedTasks,
        },
      });

    } catch (error) {

      console.error("❌ Platform stats error:", error);

      res.status(500).json({
        error: "Failed to fetch platform statistics",
      });
    }
  }
);

module.exports = router;