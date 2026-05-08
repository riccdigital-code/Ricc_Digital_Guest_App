//////////////////////////////////////////////////////////
// 📞 CALL ROUTES (GUEST - CALL NOW FEATURE)
//////////////////////////////////////////////////////////

const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");
const { createCallSchema } = require("../validators/callValidator");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const MAX_URGENT_PER_STAFF = 5;

//////////////////////////////////////////////////////////
// 🔹 CREATE CALL (GUEST ONLY)
//////////////////////////////////////////////////////////

router.post(
  "/",
  authenticate,
  authorizeRoles("GUEST", "ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const validatedData = createCallSchema.parse(req.body);

const { roomNumber, phone, urgency } = validatedData;

      if (!roomNumber || roomNumber.trim() === "") {
        return res.status(400).json({
          message: "Valid roomNumber is required",
        });
      }

      const propertyId = req.user.propertyId;

      //////////////////////////////////////////////////////////
      // 1️⃣ CREATE CALL LOG
      //////////////////////////////////////////////////////////
      const call = await prisma.callLog.create({
        data: {
          propertyId,
          roomNumber,
          phone,
          urgency: urgency || "normal",
        },
      });

      //////////////////////////////////////////////////////////
      // 🧠 PRIORITY LOGIC (FIXED POSITION)
      //////////////////////////////////////////////////////////
      let priorityLevel = "normal";

      if (urgency === "high") {
        priorityLevel = "high";
      } else if (urgency === "low") {
        priorityLevel = "low";
      }

      //////////////////////////////////////////////////////////
      // 🧠 FIND LEAST BUSY STAFF
      //////////////////////////////////////////////////////////
      const staffWithLoad = await prisma.user.findMany({
        where: {
          propertyId,
          role: "STAFF",
        },
        include: {
          tasks: {
            where: {
              status: {
                in: ["pending", "in_progress"],
              },
            },
          },
        },
      });

      //////////////////////////////////////////////////////////
      // 🔍 PICK STAFF WITH FEWEST TASKS
      //////////////////////////////////////////////////////////
      let selectedStaff = null;

if (staffWithLoad.length > 0) {
  const firstStaff = staffWithLoad[0];

  if (priorityLevel === "high") {
    //////////////////////////////////////////////////////////
    // 🔥 CHECK IF FIRST STAFF IS OVERLOADED
    //////////////////////////////////////////////////////////
    if (firstStaff.tasks.length < MAX_URGENT_PER_STAFF) {
      selectedStaff = firstStaff;
    } else {
      //////////////////////////////////////////////////////////
      // ⚖️ FALLBACK → BALANCE
      //////////////////////////////////////////////////////////
      selectedStaff = staffWithLoad.reduce((prev, current) => {
        return prev.tasks.length <= current.tasks.length ? prev : current;
      });
    }
  } else {
    //////////////////////////////////////////////////////////
    // 🧠 NORMAL → ALWAYS BALANCE
    //////////////////////////////////////////////////////////
    selectedStaff = staffWithLoad.reduce((prev, current) => {
      return prev.tasks.length <= current.tasks.length ? prev : current;
    });
  }
} else {
          // 🧠 normal → balance load
          selectedStaff = staffWithLoad.reduce((prev, current) => {
            return prev.tasks.length <= current.tasks.length ? prev : current;
          });
        }

           //////////////////////////////////////////////////////////
      // 2️⃣ CREATE TASK AUTOMATICALLY
      //////////////////////////////////////////////////////////
      const task = await prisma.task.create({
        data: {
          propertyId,
          itemName: `Call from Room ${roomNumber}`,
          status: "pending",
          priority: priorityLevel,
          callLogId: call.id,
          assignedToId: selectedStaff ? selectedStaff.id : null,
        },
      });

      //////////////////////////////////////////////////////////
      // 🔥 REAL-TIME TASK EVENT
      //////////////////////////////////////////////////////////
      const io = req.app.get("io");

      io.emit("newTask", {
        message: "New task assigned",
        task,
      });

      //////////////////////////////////////////////////////////
      // 3️⃣ RESPONSE
      //////////////////////////////////////////////////////////
      res.status(201).json({
        message: "Call logged & task created",
        call,
        task,
      });

    } catch (error) {
      console.error("❌ Call error:", error);
      res.status(500).json({ error: "Failed to log call" });
    }
  }
);

module.exports = router;