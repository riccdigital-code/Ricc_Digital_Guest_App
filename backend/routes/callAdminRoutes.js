//////////////////////////////////////////////////////////
// 📞 CALL ADMIN ROUTES (MANAGEMENT LAYER)
//////////////////////////////////////////////////////////

const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

//////////////////////////////////////////////////////////
// 🔹 GET ALL CALLS (ADMIN DASHBOARD)
//////////////////////////////////////////////////////////

router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {

    try {
      const calls = await prisma.callLog.findMany({
        where: {
          propertyId: req.user.propertyId,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(calls);

    } catch (error) {
      console.error("❌ Error fetching calls:", error);
      res.status(500).json({ error: "Failed to fetch calls" });
    }
  }
);

module.exports = router;