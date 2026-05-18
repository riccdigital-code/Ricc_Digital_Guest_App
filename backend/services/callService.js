//////////////////////////////////////////////////////////
// 📞 CALL SERVICE
// Business logic for guest call operations
//
// RESPONSIBILITY:
//   Everything that happens when a guest calls
//   for assistance — from validation to task creation
//   to realtime notification.
//
// USED BY:
//   callRoutes.js      — POST /api/calls
//   callAdminRoutes.js — PATCH /:id/reassign
//
// DOES NOT:
//   Handle HTTP requests or responses
//   Know about req, res, or next
//   Import express
//////////////////////////////////////////////////////////

const prisma = require("../prismaClient");

const {
  routeTask,
  buildAssignmentResponse,
} = require("./taskRoutingService");

const {
  notifyNewCall,
  notifyTaskReassigned,
} = require("./socketService");

const {
  CALL_TYPE_PRIORITY_MAP,
  CALL_TYPES,
} = require("../constants/callTypes");

//////////////////////////////////////////////////////////
// RESOLVE PRIORITY FROM CALL TYPE
//
// EMERGENCY → high
// All other types → normal
// Centralised so routing engine uses correct priority
//////////////////////////////////////////////////////////

function resolvePriorityFromCallType(callType) {
  return CALL_TYPE_PRIORITY_MAP[callType] || "normal";
}

//////////////////////////////////////////////////////////
// CREATE CALL
//
// Full orchestration of the guest call flow:
//   1. Resolve priority from call type
//   2. Verify property exists
//   3. Verify guest has active session
//   4. Route task to staff
//   5. Atomic transaction: CallLog + Task
//   6. Emit realtime notification
//
// Parameters:
//   data — { roomNumber, callType, phone, notes }
//   user — req.user from authMiddleware
//   io   — socket.io instance from req.app.get("io")
//
// Returns: { call, task, assignment, routing }
// Throws:  Error with message for route to handle
//////////////////////////////////////////////////////////

async function createCall(data, user, io) {

  //////////////////////////////////////////////////////////
  // DESTRUCTURE — aligned to callValidator createCallSchema
  //   roomNumber, callType, phone, notes
  // propertyId comes from JWT token — not from body
  //////////////////////////////////////////////////////////

  const { roomNumber, callType, phone, notes } = data;
  const propertyId = user.propertyId;

  //////////////////////////////////////////////////////////
  // STEP 1 — RESOLVE PRIORITY FROM CALL TYPE
  // EMERGENCY → high
  // Everything else → normal
  //////////////////////////////////////////////////////////

  const priority = resolvePriorityFromCallType(callType);

  //////////////////////////////////////////////////////////
  // STEP 2 — VERIFY PROPERTY EXISTS
  //////////////////////////////////////////////////////////

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) {
    throw new Error("Property not found");
  }

  //////////////////////////////////////////////////////////
  // STEP 3 — VERIFY GUEST HAS ACTIVE SESSION
  // A guest should only be calling from an active booking
  //////////////////////////////////////////////////////////

  const activeSession = await prisma.guestSession.findFirst({
    where: {
      propertyId,
      roomNumber: roomNumber.trim(),
      status:     "active",
      expiresAt:  { gt: new Date() },
    },
  });

  if (!activeSession) {
    throw new Error("No active booking found for this room");
  }

  //////////////////////////////////////////////////////////
  // STEP 4 — ROUTE TASK TO STAFF
  // Routing engine selects least-busy staff
  // EMERGENCY calls use threshold-based selection
  //////////////////////////////////////////////////////////

  const { selectedStaff, isUnassigned, loadSummary } =
    await routeTask(propertyId, priority, "call");

  //////////////////////////////////////////////////////////
  // STEP 5 — ATOMIC TRANSACTION
  // CallLog + Task created together or not at all
  // If task creation fails, no orphaned call log exists
  //////////////////////////////////////////////////////////

  const result = await prisma.$transaction(async (tx) => {

    //////////////////////////////////////////////////////////
    // CREATE CALL LOG
    // callType stored for analytics + routing context
    // urgency derived from callType for backwards compat
    //////////////////////////////////////////////////////////

    const call = await tx.callLog.create({
      data: {
        propertyId,
        roomNumber: roomNumber.trim(),
        phone:      phone?.trim() || null,
        callType,
        urgency:    priority,
        notes:      notes   || null,
        status:     "pending",
      },
    });

    //////////////////////////////////////////////////////////
    // CREATE TASK LINKED TO CALL LOG
    // itemName includes callType for staff context
    //////////////////////////////////////////////////////////

    const task = await tx.task.create({
      data: {
        propertyId,
        itemName:     `${callType} Call — Room ${roomNumber.trim()}`,
        status:       "pending",
        priority,
        callLogId:    call.id,
        assignedToId: selectedStaff ? selectedStaff.id : null,
      },
    });

    return { call, task };
  });

  //////////////////////////////////////////////////////////
  // STEP 6 — EMIT REALTIME NOTIFICATION
  // Property-scoped — only staff at this hotel receive it
  //////////////////////////////////////////////////////////

  notifyNewCall(io, result.call, result.task);

  //////////////////////////////////////////////////////////
  // STEP 7 — LOG OPERATION
  //////////////////////////////////////////////////////////

  console.log(
    `📞 Call created | Type: ${callType} | Room: ${roomNumber} | Priority: ${priority} | Property: ${propertyId} | Assigned: ${selectedStaff?.name || "UNASSIGNED"}`
  );

  //////////////////////////////////////////////////////////
  // STEP 8 — RETURN STRUCTURED RESULT
  //////////////////////////////////////////////////////////

  return {
    call:       result.call,
    task:       result.task,
    assignment: buildAssignmentResponse(selectedStaff),
    routing: {
      priority,
      callType,
      staffAvailable: loadSummary.length,
      isUnassigned,
    },
  };
}

//////////////////////////////////////////////////////////
// GET ALL CALLS
//
// Fetches call logs scoped by role.
// ADMIN — own property only
// SUPER_ADMIN — all properties
//
// Parameters:
//   user    — req.user
//   filters — { callType, status, unresolved }
//
// Returns: { calls, total }
//////////////////////////////////////////////////////////

async function getCalls(user, filters = {}) {

  const where = {};

  //////////////////////////////////////////////////////////
  // SCOPE BY ROLE
  //////////////////////////////////////////////////////////

  if (user.role === "ADMIN") {
    where.propertyId = user.propertyId;
  }

  //////////////////////////////////////////////////////////
  // OPTIONAL CALL TYPE FILTER
  //////////////////////////////////////////////////////////

  if (filters.callType) {
    if (!Object.values(CALL_TYPES).includes(filters.callType)) {
      throw new Error(
        `Invalid callType. Must be: ${Object.values(CALL_TYPES).join(", ")}`
      );
    }
    where.callType = filters.callType;
  }

  //////////////////////////////////////////////////////////
  // OPTIONAL STATUS FILTER
  //////////////////////////////////////////////////////////

  if (filters.status) {
    where.status = filters.status;
  }

  //////////////////////////////////////////////////////////
  // FETCH CALLS WITH TASK AND ASSIGNEE
  //////////////////////////////////////////////////////////

  let calls = await prisma.callLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      task: {
        include: {
          assignedTo: {
            select: {
              id:   true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });

  //////////////////////////////////////////////////////////
  // OPTIONAL UNRESOLVED FILTER
  // Applied in memory — task status not a DB column on callLog
  //////////////////////////////////////////////////////////

  if (filters.unresolved === "true" || filters.unresolved === true) {
    calls = calls.filter(
      (call) => !call.task || call.task.status !== "completed"
    );
  }

  return {
    calls,
    total: calls.length,
  };
}

//////////////////////////////////////////////////////////
// GET SINGLE CALL
//////////////////////////////////////////////////////////

async function getCallById(callId, user) {

  const call = await prisma.callLog.findUnique({
    where: { id: callId },
    include: {
      task: {
        include: {
          assignedTo: {
            select: {
              id:   true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!call) {
    throw new Error("Call not found");
  }

  if (
    user.role === "ADMIN" &&
    call.propertyId !== user.propertyId
  ) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  return { call };
}

//////////////////////////////////////////////////////////
// GET CALL STATISTICS
//////////////////////////////////////////////////////////

async function getCallStats(user) {

  const propertyFilter =
    user.role === "ADMIN"
      ? { propertyId: user.propertyId }
      : {};

  //////////////////////////////////////////////////////////
  // PARALLEL QUERIES
  //////////////////////////////////////////////////////////

  const [callTypeGroups, taskStatusGroups, total] =
    await Promise.all([

      //////////////////////////////////////////////////////////
      // CALLS GROUPED BY CALL TYPE
      // More useful operationally than urgency grouping
      //////////////////////////////////////////////////////////

      prisma.callLog.groupBy({
        by:    ["callType"],
        where: propertyFilter,
        _count: { callType: true },
      }),

      //////////////////////////////////////////////////////////
      // CALL TASKS GROUPED BY STATUS
      //////////////////////////////////////////////////////////

      prisma.task.groupBy({
        by:    ["status"],
        where: {
          ...propertyFilter,
          callLogId: { not: null },
        },
        _count: { status: true },
      }),

      //////////////////////////////////////////////////////////
      // TOTAL CALL COUNT
      //////////////////////////////////////////////////////////

      prisma.callLog.count({
        where: propertyFilter,
      }),
    ]);

  //////////////////////////////////////////////////////////
  // NORMALISE CALL TYPE COUNTS
  //////////////////////////////////////////////////////////

  const byCallType = {};
  for (const type of Object.values(CALL_TYPES)) {
    byCallType[type] = 0;
  }
  for (const group of callTypeGroups) {
    byCallType[group.callType] = group._count.callType;
  }

  //////////////////////////////////////////////////////////
  // NORMALISE TASK STATUS COUNTS
  //////////////////////////////////////////////////////////

  const byTaskStatus = {
    pending:     0,
    in_progress: 0,
    completed:   0,
  };
  for (const group of taskStatusGroups) {
    byTaskStatus[group.status] = group._count.status;
  }

  return {
    stats: {
      total,
      byCallType,
      byTaskStatus,
      unresolved:     byTaskStatus.pending + byTaskStatus.in_progress,
      resolutionRate: total > 0
        ? Math.round((byTaskStatus.completed / total) * 100)
        : 0,
    },
  };
}

//////////////////////////////////////////////////////////
// REASSIGN CALL TASK
//////////////////////////////////////////////////////////

async function reassignCallTask(callId, assignedToId, user, io) {

  const call = await prisma.callLog.findUnique({
    where:   { id: callId },
    include: { task: true },
  });

  if (!call) {
    throw new Error("Call not found");
  }

  if (
    user.role === "ADMIN" &&
    call.propertyId !== user.propertyId
  ) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  if (!call.task) {
    throw new Error("No task found for this call");
  }

  const targetStaff = await prisma.user.findUnique({
    where: { id: assignedToId },
  });

  if (!targetStaff) {
    throw new Error("Target staff member not found");
  }

  if (targetStaff.role !== "STAFF") {
    const error = new Error("Tasks can only be assigned to STAFF members");
    error.statusCode = 400;
    error.code = "INVALID_STAFF_ROLE";
    throw error;
  }

  if (targetStaff.propertyId !== call.propertyId) {
    const error = new Error("Staff member does not belong to this property");
    error.statusCode = 400;
    error.code = "WRONG_PROPERTY";
    throw error;
  }

  const previousAssigneeId = call.task.assignedToId;

  const updatedTask = await prisma.task.update({
    where: { id: call.task.id },
    data:  { assignedToId },
  });

  notifyTaskReassigned(io, updatedTask, previousAssigneeId);

  console.log(
    `🔁 Call ${callId} reassigned | From: ${previousAssigneeId || "unassigned"} → To: ${assignedToId} | By: ${user.id}`
  );

  return { task: updatedTask };
}

//////////////////////////////////////////////////////////
// EXPORTS
//////////////////////////////////////////////////////////

module.exports = {
  createCall,
  getCalls,
  getCallById,
  getCallStats,
  reassignCallTask,
};