//////////////////////////////////////////////////////////
// 🧠 TASK ROUTING SERVICE
// Intelligent staff assignment engine
// Used by: callRoutes, orderRoutes, requestRoutes
//
// ROUTING PHILOSOPHY:
//   1. High priority → find staff under urgent threshold
//   2. All priorities → balance load across staff
//   3. No staff available → create unassigned task
//   4. All decisions logged for audit trail
//////////////////////////////////////////////////////////

const prisma = require("../prismaClient");

//////////////////////////////////////////////////////////
// ROUTING CONFIGURATION
// Centralised — change here, applies everywhere
//////////////////////////////////////////////////////////

const ROUTING_CONFIG = {

  //////////////////////////////////////////////////////////
  // MAX active tasks a staff member can hold
  // before being considered "overloaded" for high priority
  //////////////////////////////////////////////////////////

  MAX_URGENT_PER_STAFF: 5,

  //////////////////////////////////////////////////////////
  // PRIORITY LEVELS — valid values across the platform
  //////////////////////////////////////////////////////////

  PRIORITIES: {
    HIGH:   "high",
    NORMAL: "normal",
    LOW:    "low",
  },

  //////////////////////////////////////////////////////////
  // PRIORITY MAP
  // Maps incoming urgency strings to task priority values
  // Handles inconsistent input gracefully
  //////////////////////////////////////////////////////////

  PRIORITY_MAP: {
    high:   "high",
    normal: "normal",
    low:    "low",
    urgent: "high",    // alias — some routes may use "urgent"
  },

  //////////////////////////////////////////////////////////
  // TASK STATUS VALUES
  // Active statuses used in load calculation
  //////////////////////////////////////////////////////////

  ACTIVE_STATUSES: ["pending", "in_progress"],
};

//////////////////////////////////////////////////////////
// LOAD STAFF WITH ACTIVE TASK COUNTS
//
// Fetches all STAFF for a property with their
// current active task count attached.
//
// This is the foundation query for all routing decisions.
// Single DB call — do not call inside loops.
//
// Returns: Array of staff with .tasks populated
// Returns: [] if no staff found
//////////////////////////////////////////////////////////

async function loadStaffWithTasks(propertyId) {

  if (!propertyId) {
    throw new Error("loadStaffWithTasks: propertyId is required");
  }

  const staff = await prisma.user.findMany({
    where: {
      propertyId,
      role: "STAFF",
    },
    include: {
      tasks: {
        where: {
          status: {
            in: ROUTING_CONFIG.ACTIVE_STATUSES,
          },
        },
        select: {
          id:       true,
          status:   true,
          priority: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return staff;
}

//////////////////////////////////////////////////////////
// GET STAFF LOAD SUMMARY
//
// Converts raw staff array into a clean summary
// useful for logging and admin dashboards.
//
// Returns: Array of { id, name, taskCount, highPriorityCount }
//////////////////////////////////////////////////////////

function getLoadSummary(staffWithLoad) {
  return staffWithLoad.map((staff) => ({
    id:                staff.id,
    name:              staff.name,
    taskCount:         staff.tasks.length,
    highPriorityCount: staff.tasks.filter(
      (t) => t.priority === ROUTING_CONFIG.PRIORITIES.HIGH
    ).length,
  }));
}

//////////////////////////////////////////////////////////
// FIND LEAST BUSY STAFF
//
// Core balancing algorithm.
// Returns the staff member with fewest active tasks.
// On tie — returns first in sorted order (alphabetical by name).
//
// Returns: staff object or null
//////////////////////////////////////////////////////////

function findLeastBusy(staffWithLoad) {
  if (!staffWithLoad || staffWithLoad.length === 0) {
    return null;
  }

  return staffWithLoad.reduce((least, current) => {
    return current.tasks.length < least.tasks.length
      ? current
      : least;
  });
}

//////////////////////////////////////////////////////////
// FIND STAFF UNDER URGENT THRESHOLD
//
// For high priority tasks — find the first staff member
// whose active task count is below MAX_URGENT_PER_STAFF.
//
// Returns: staff object or null if all are at capacity
//////////////////////////////////////////////////////////

function findStaffUnderThreshold(staffWithLoad) {
  return (
    staffWithLoad.find(
      (staff) =>
        staff.tasks.length < ROUTING_CONFIG.MAX_URGENT_PER_STAFF
    ) || null
  );
}

//////////////////////////////////////////////////////////
// SELECT STAFF — MAIN ROUTING ENGINE
//
// Determines which staff member receives a task
// based on priority level and current workload.
//
// ROUTING LOGIC:
//
//   HIGH PRIORITY:
//     1. Find staff under urgent threshold (< MAX_URGENT)
//     2. If none found → fall back to least busy
//     3. If no staff at all → return null
//
//   NORMAL / LOW PRIORITY:
//     1. Always balance — find least busy
//     2. If no staff → return null
//
// Returns: staff object or null
//////////////////////////////////////////////////////////

function selectStaff(staffWithLoad, priorityLevel = "normal") {

  //////////////////////////////////////////////////////////
  // NO STAFF AVAILABLE
  //////////////////////////////////////////////////////////

  if (!staffWithLoad || staffWithLoad.length === 0) {
    return null;
  }

  //////////////////////////////////////////////////////////
  // NORMALISE PRIORITY
  // Map incoming value to known priority
  // Default to normal if unrecognised
  //////////////////////////////////////////////////////////

  const normalisedPriority =
    ROUTING_CONFIG.PRIORITY_MAP[priorityLevel] ||
    ROUTING_CONFIG.PRIORITIES.NORMAL;

  //////////////////////////////////////////////////////////
  // HIGH PRIORITY ROUTING
  //////////////////////////////////////////////////////////

  if (normalisedPriority === ROUTING_CONFIG.PRIORITIES.HIGH) {

    //////////////////////////////////////////////////////////
    // FIRST — try to find staff under urgent threshold
    //////////////////////////////////////////////////////////

    const underThreshold = findStaffUnderThreshold(staffWithLoad);

    if (underThreshold) {
      return underThreshold;
    }

    //////////////////////////////////////////////////////////
    // ALL STAFF AT CAPACITY — fall back to least busy
    // Someone must handle the task even if overloaded
    //////////////////////////////////////////////////////////

    return findLeastBusy(staffWithLoad);
  }

  //////////////////////////////////////////////////////////
  // NORMAL / LOW PRIORITY — always balance load
  //////////////////////////////////////////////////////////

  return findLeastBusy(staffWithLoad);
}

//////////////////////////////////////////////////////////
// RESOLVE PRIORITY
//
// Converts a raw urgency/priority string from
// request input into a validated task priority value.
//
// Centralised so all routes produce consistent values.
//
// Returns: "high" | "normal" | "low"
//////////////////////////////////////////////////////////

function resolvePriority(input) {
  return (
    ROUTING_CONFIG.PRIORITY_MAP[input?.toLowerCase()] ||
    ROUTING_CONFIG.PRIORITIES.NORMAL
  );
}

//////////////////////////////////////////////////////////
// ROUTE TASK — FULL ORCHESTRATION
//
// The single function that most routes will call.
// Combines loadStaffWithTasks + selectStaff into
// one clean call with full logging.
//
// Parameters:
//   propertyId    — scopes staff query to property
//   priorityLevel — "high" | "normal" | "low"
//   context       — string label for logs ("call", "order", "request")
//
// Returns: {
//   selectedStaff:  staff object or null,
//   staffCount:     number of staff available,
//   loadSummary:    array of { id, name, taskCount },
//   isUnassigned:   boolean — true if no staff found,
// }
//////////////////////////////////////////////////////////

async function routeTask(propertyId, priorityLevel = "normal", context = "task") {

  //////////////////////////////////////////////////////////
  // STEP 1 — LOAD STAFF
  //////////////////////////////////////////////////////////

  const staffWithLoad = await loadStaffWithTasks(propertyId);

  //////////////////////////////////////////////////////////
  // STEP 2 — LOG ROUTING CONTEXT
  //////////////////////////////////////////////////////////

  const loadSummary = getLoadSummary(staffWithLoad);

  console.log(
    `🧠 Routing ${context} | Property: ${propertyId} | Priority: ${priorityLevel} | Staff available: ${staffWithLoad.length}`
  );

  if (staffWithLoad.length > 0) {
    console.log(
      `   Load: ${loadSummary.map((s) => `${s.name}(${s.taskCount})`).join(", ")}`
    );
  }

  //////////////////////////////////////////////////////////
  // STEP 3 — SELECT STAFF
  //////////////////////////////////////////////////////////

  const selectedStaff = selectStaff(staffWithLoad, priorityLevel);

  //////////////////////////////////////////////////////////
  // STEP 4 — LOG DECISION
  //////////////////////////////////////////////////////////

  if (selectedStaff) {
    console.log(
      `   ✅ Assigned to: ${selectedStaff.name} (${selectedStaff.tasks.length} active tasks)`
    );
  } else {
    console.warn(
      `   ⚠️ No staff available for property ${propertyId}. Task will be unassigned.`
    );
  }

  //////////////////////////////////////////////////////////
  // STEP 5 — RETURN FULL ROUTING RESULT
  //////////////////////////////////////////////////////////

  return {
    selectedStaff,
    staffCount:   staffWithLoad.length,
    loadSummary,
    isUnassigned: selectedStaff === null,
  };
}

//////////////////////////////////////////////////////////
// BUILD ASSIGNMENT RESPONSE
//
// Builds the consistent "assigned" block
// returned by all task-creating routes.
//
// Centralised so every route returns the same shape.
//////////////////////////////////////////////////////////

function buildAssignmentResponse(selectedStaff) {
  if (selectedStaff) {
    return {
      staffId:  selectedStaff.id,
      staffName: selectedStaff.name,
    };
  }

  return {
    staffId: null,
    warning: "No staff available. Task is unassigned. Admin must assign manually.",
  };
}

//////////////////////////////////////////////////////////
// EXPORTS
//////////////////////////////////////////////////////////

module.exports = {
  //////////////////////////////////////////////////////////
  // PRIMARY — use this in most routes
  //////////////////////////////////////////////////////////
  routeTask,

  //////////////////////////////////////////////////////////
  // GRANULAR — use when you need more control
  //////////////////////////////////////////////////////////
  loadStaffWithTasks,
  selectStaff,
  resolvePriority,
  buildAssignmentResponse,

  //////////////////////////////////////////////////////////
  // UTILITIES
  //////////////////////////////////////////////////////////
  getLoadSummary,
  findLeastBusy,
  findStaffUnderThreshold,

  //////////////////////////////////////////////////////////
  // CONSTANTS — importable by routes for validation
  //////////////////////////////////////////////////////////
  ROUTING_CONFIG,
};