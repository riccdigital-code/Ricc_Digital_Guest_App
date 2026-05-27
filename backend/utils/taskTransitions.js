//////////////////////////////////////////////////////////
// 🔄 TASK TRANSITION VALIDATOR
// Centralised state machine enforcement for task status
//
// PURPOSE:
//   Validates whether a status transition is allowed.
//   Returns human-readable, operationally meaningful
//   error messages — not generic state machine text.
//
// USED BY:
//   routes/taskRoutes.js — PATCH /:id/status
//
// WHY CENTRALISED:
//   One place to add new transition rules
//   One place to improve error messages
//   Route stays clean — zero transition logic inline
//   Future: reuse in orderRoutes, requestRoutes
//////////////////////////////////////////////////////////

const {
  TASK_STATUSES,
  TASK_STATUS_TRANSITIONS,
  TERMINAL_TASK_STATUSES,
} = require("../constants/taskStatuses");

//////////////////////////////////////////////////////////
// HUMAN-READABLE TRANSITION ERROR MESSAGES
//
// Maps specific current→next combinations to
// messages a hotel staff member would understand.
//
// Add new entries here when new rules are needed.
// Fallback generic message handles everything else.
//////////////////////////////////////////////////////////

const TRANSITION_MESSAGES = {

  //////////////////////////////////////////////////////////
  // TERMINAL STATE ATTEMPTS
  // Task is done — cannot be moved anywhere
  //////////////////////////////////////////////////////////

  [`${TASK_STATUSES.COMPLETED}→${TASK_STATUSES.COMPLETED}`]: {
    error: "This task is already completed.",
    code:  "ALREADY_COMPLETED",
  },

  [`${TASK_STATUSES.COMPLETED}→${TASK_STATUSES.IN_PROGRESS}`]: {
    error: "This task is already completed and cannot be reopened.",
    code:  "TASK_ALREADY_COMPLETED",
  },

  [`${TASK_STATUSES.COMPLETED}→${TASK_STATUSES.PENDING}`]: {
    error: "This task is already completed and cannot be reopened.",
    code:  "TASK_ALREADY_COMPLETED",
  },

  [`${TASK_STATUSES.COMPLETED}→${TASK_STATUSES.ASSIGNED}`]: {
    error: "This task is already completed and cannot be reopened.",
    code:  "TASK_ALREADY_COMPLETED",
  },

  [`${TASK_STATUSES.COMPLETED}→${TASK_STATUSES.ESCALATED}`]: {
    error: "This task is already completed and cannot be escalated.",
    code:  "TASK_ALREADY_COMPLETED",
  },

  [`${TASK_STATUSES.CANCELLED}→${TASK_STATUSES.CANCELLED}`]: {
    error: "This task is already cancelled.",
    code:  "ALREADY_CANCELLED",
  },

  [`${TASK_STATUSES.CANCELLED}→${TASK_STATUSES.IN_PROGRESS}`]: {
    error: "This task has been cancelled and cannot be restarted.",
    code:  "TASK_ALREADY_CANCELLED",
  },

  [`${TASK_STATUSES.CANCELLED}→${TASK_STATUSES.COMPLETED}`]: {
    error: "This task has been cancelled and cannot be completed.",
    code:  "TASK_ALREADY_CANCELLED",
  },

  //////////////////////////////////////////////////////////
  // SKIPPED STEPS — trying to jump ahead in the workflow
  //////////////////////////////////////////////////////////

  [`${TASK_STATUSES.PENDING}→${TASK_STATUSES.COMPLETED}`]: {
    error: "Task must be accepted and started before it can be completed.",
    code:  "STEPS_SKIPPED",
    hint:  `Move to "${TASK_STATUSES.ASSIGNED}" first, then "${TASK_STATUSES.IN_PROGRESS}", then "${TASK_STATUSES.COMPLETED}".`,
  },

  [`${TASK_STATUSES.PENDING}→${TASK_STATUSES.IN_PROGRESS}`]: {
    error: "Task must be accepted before work can begin.",
    code:  "MUST_ACCEPT_FIRST",
    hint:  `Move to "${TASK_STATUSES.ASSIGNED}" first.`,
  },

  [`${TASK_STATUSES.PENDING}→${TASK_STATUSES.ESCALATED}`]: {
    error: "Task must be accepted and started before it can be escalated.",
    code:  "STEPS_SKIPPED",
    hint:  `Move to "${TASK_STATUSES.ASSIGNED}", then "${TASK_STATUSES.IN_PROGRESS}", then escalate if needed.`,
  },

  [`${TASK_STATUSES.ASSIGNED}→${TASK_STATUSES.COMPLETED}`]: {
    error: "Task must be started before it can be completed.",
    code:  "MUST_START_FIRST",
    hint:  `Move to "${TASK_STATUSES.IN_PROGRESS}" first.`,
  },

  //////////////////////////////////////////////////////////
  // BACKWARDS MOVES — trying to revert progress
  //////////////////////////////////////////////////////////

  [`${TASK_STATUSES.IN_PROGRESS}→${TASK_STATUSES.PENDING}`]: {
    error: "Task cannot be moved back to pending once work has started.",
    code:  "CANNOT_MOVE_BACKWARD",
  },

  [`${TASK_STATUSES.IN_PROGRESS}→${TASK_STATUSES.ASSIGNED}`]: {
    error: "Task cannot be moved back to assigned once work has started.",
    code:  "CANNOT_MOVE_BACKWARD",
  },

  [`${TASK_STATUSES.ASSIGNED}→${TASK_STATUSES.PENDING}`]: {
    error: "Task cannot be moved back to pending once accepted.",
    code:  "CANNOT_MOVE_BACKWARD",
  },

  [`${TASK_STATUSES.ESCALATED}→${TASK_STATUSES.COMPLETED}`]: {
    error: "Escalated tasks must be restarted before they can be completed.",
    code:  "MUST_RESTART_ESCALATED",
    hint:  `Move to "${TASK_STATUSES.IN_PROGRESS}" first.`,
  },

  [`${TASK_STATUSES.ESCALATED}→${TASK_STATUSES.PENDING}`]: {
    error: "Escalated tasks cannot be moved back to pending.",
    code:  "CANNOT_MOVE_BACKWARD",
  },
};

//////////////////////////////////////////////////////////
// VALIDATE STATUS TRANSITION
//
// The single function taskRoutes.js calls.
// Returns { valid: true } on success.
// Returns { valid: false, ...errorDetails } on failure.
//
// Parameters:
//   current — current task status (string)
//   next    — requested new status (string)
//
// Returns:
//   { valid: true }
//   { valid: false, error, code, currentStatus, [hint], [allowedTransitions] }
//////////////////////////////////////////////////////////

function validateStatusTransition(current, next) {

  //////////////////////////////////////////////////////////
  // GUARD — unknown current status
  // Should not happen in practice — DB enforces valid values
  //////////////////////////////////////////////////////////

  if (!TASK_STATUS_TRANSITIONS.hasOwnProperty(current)) {
    return {
      valid:         false,
      error:         `Unknown current status: "${current}"`,
      code:          "UNKNOWN_STATUS",
      currentStatus: current,
    };
  }

  //////////////////////////////////////////////////////////
  // STEP 1 — CHECK FOR SPECIFIC HUMAN-READABLE MESSAGE
  // Lookup key: "current→next"
  //////////////////////////////////////////////////////////

  const lookupKey = `${current}→${next}`;
  const specific  = TRANSITION_MESSAGES[lookupKey];

  if (specific) {
    return {
      valid:         false,
      currentStatus: current,
      ...specific,
    };
  }

  //////////////////////////////////////////////////////////
  // STEP 2 — CHECK AGAINST TRANSITION MAP
  // If not in the specific messages but also not allowed
  //////////////////////////////////////////////////////////

  const allowedNext = TASK_STATUS_TRANSITIONS[current] || [];

  if (!allowedNext.includes(next)) {
    return {
      valid:              false,
      error:              `Cannot move task from "${current}" to "${next}".`,
      code:               "INVALID_TRANSITION",
      currentStatus:      current,
      allowedTransitions: allowedNext,
    };
  }

  //////////////////////////////////////////////////////////
  // STEP 3 — TRANSITION IS VALID
  //////////////////////////////////////////////////////////

  return { valid: true };
}

//////////////////////////////////////////////////////////
// EXPORTS
//////////////////////////////////////////////////////////

module.exports = {
  validateStatusTransition,
  TRANSITION_MESSAGES,
};