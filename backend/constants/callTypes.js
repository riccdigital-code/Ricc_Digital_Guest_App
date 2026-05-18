//////////////////////////////////////////////////////////
// 📞 CALL TYPE CONSTANTS
// Single source of truth for call type values
//
// USED BY:
//   validators/callValidator.js
//   validators/sharedSchemas.js
//   services/callService.js
//   routes/callRoutes.js
//   routes/callAdminRoutes.js
//////////////////////////////////////////////////////////

const CALL_TYPES = {
  SUPPORT:      "SUPPORT",
  EMERGENCY:    "EMERGENCY",
  HOUSEKEEPING: "HOUSEKEEPING",
  MAINTENANCE:  "MAINTENANCE",
  DELIVERY:     "DELIVERY",
  MANAGEMENT:   "MANAGEMENT",
};

//////////////////////////////////////////////////////////
// HIGH PRIORITY CALL TYPES
// These automatically route as high priority tasks
//////////////////////////////////////////////////////////

const HIGH_PRIORITY_CALL_TYPES = [
  CALL_TYPES.EMERGENCY,
];

//////////////////////////////////////////////////////////
// CALL TYPE TO TASK PRIORITY MAP
// Determines task priority based on call type
//////////////////////////////////////////////////////////

const CALL_TYPE_PRIORITY_MAP = {
  [CALL_TYPES.EMERGENCY]:    "high",
  [CALL_TYPES.SUPPORT]:      "normal",
  [CALL_TYPES.HOUSEKEEPING]: "normal",
  [CALL_TYPES.MAINTENANCE]:  "normal",
  [CALL_TYPES.DELIVERY]:     "low",
  [CALL_TYPES.MANAGEMENT]:   "normal",
};

module.exports = {
  CALL_TYPES,
  HIGH_PRIORITY_CALL_TYPES,
  CALL_TYPE_PRIORITY_MAP,
};