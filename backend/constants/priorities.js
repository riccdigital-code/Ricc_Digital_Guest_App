//////////////////////////////////////////////////////////
// ⚡ PRIORITY CONSTANTS
// Single source of truth for priority values
//
// USED BY:
//   validators/taskValidator.js
//   validators/sharedSchemas.js
//   services/taskRoutingService.js
//   services/callService.js
//   routes/taskRoutes.js
//////////////////////////////////////////////////////////

const PRIORITIES = {
  LOW:      "low",
  NORMAL:   "normal",
  HIGH:     "high",
  CRITICAL: "critical",
};

//////////////////////////////////////////////////////////
// PRIORITY MAP
// Maps various input strings to standard values
// Handles aliases and inconsistent input gracefully
//////////////////////////////////////////////////////////

const PRIORITY_MAP = {
  low:      PRIORITIES.LOW,
  normal:   PRIORITIES.NORMAL,
  high:     PRIORITIES.HIGH,
  critical: PRIORITIES.CRITICAL,
  urgent:   PRIORITIES.HIGH,      // alias
  emergency: PRIORITIES.CRITICAL, // alias
};

//////////////////////////////////////////////////////////
// ROUTING THRESHOLDS
// Maximum active tasks per priority level
// Used by taskRoutingService
//////////////////////////////////////////////////////////

const ROUTING_THRESHOLDS = {
  [PRIORITIES.HIGH]:     5,
  [PRIORITIES.CRITICAL]: 3,
  [PRIORITIES.NORMAL]:   null, // no threshold — always balance
  [PRIORITIES.LOW]:      null,
};

module.exports = {
  PRIORITIES,
  PRIORITY_MAP,
  ROUTING_THRESHOLDS,
};