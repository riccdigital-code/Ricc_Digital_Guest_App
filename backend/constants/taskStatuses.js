//////////////////////////////////////////////////////////
// 📋 TASK STATUS CONSTANTS
// Single source of truth for task status values
//
// USED BY:
//   validators/taskValidator.js
//   validators/sharedSchemas.js
//   services/taskRoutingService.js
//   routes/taskRoutes.js
//   routes/orderRoutes.js
//   routes/requestRoutes.js
//   routes/callRoutes.js
//
// WHY CENTRALISED:
//   Prevents enum drift across files
//   Typo in one place — caught immediately
//   Rename propagates automatically
//   Analytics queries always match DB values
//////////////////////////////////////////////////////////

const TASK_STATUSES = {
  PENDING:     "pending",
  ASSIGNED:    "assigned",
  IN_PROGRESS: "in_progress",
  COMPLETED:   "completed",
  CANCELLED:   "cancelled",
  ESCALATED:   "escalated",
};

//////////////////////////////////////////////////////////
// ACTIVE STATUSES
// Tasks that count toward staff workload
// Used by routing engine and dashboard queries
//////////////////////////////////////////////////////////

const ACTIVE_TASK_STATUSES = [
  TASK_STATUSES.PENDING,
  TASK_STATUSES.ASSIGNED,
  TASK_STATUSES.IN_PROGRESS,
];

//////////////////////////////////////////////////////////
// TERMINAL STATUSES
// Tasks that are no longer active
// Used by analytics and cleanup queries
//////////////////////////////////////////////////////////

const TERMINAL_TASK_STATUSES = [
  TASK_STATUSES.COMPLETED,
  TASK_STATUSES.CANCELLED,
];

//////////////////////////////////////////////////////////
// VALID STATUS TRANSITIONS
// Maps current status → allowed next statuses
// Enforced in taskRoutes PATCH /:id/status
//////////////////////////////////////////////////////////

const TASK_STATUS_TRANSITIONS = {
  [TASK_STATUSES.PENDING]:     [TASK_STATUSES.ASSIGNED,    TASK_STATUSES.CANCELLED],
  [TASK_STATUSES.ASSIGNED]:    [TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.CANCELLED],
  [TASK_STATUSES.IN_PROGRESS]: [TASK_STATUSES.COMPLETED,   TASK_STATUSES.ESCALATED, TASK_STATUSES.CANCELLED],
  [TASK_STATUSES.ESCALATED]:   [TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.CANCELLED],
  [TASK_STATUSES.COMPLETED]:   [],
  [TASK_STATUSES.CANCELLED]:   [],
};

module.exports = {
  TASK_STATUSES,
  ACTIVE_TASK_STATUSES,
  TERMINAL_TASK_STATUSES,
  TASK_STATUS_TRANSITIONS,
};