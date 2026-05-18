//////////////////////////////////////////////////////////
// 📋 TASK VALIDATOR
// Zod v3 — lowercase statuses, aligned to constants
//
// STATUS CONVENTION:
//   lowercase everywhere — matches Prisma defaults
//   imports from constants/taskStatuses.js
//   never hardcoded inline
//
// PRIORITY CONVENTION:
//   lowercase everywhere — matches Prisma defaults
//   imports from constants/priorities.js
//////////////////////////////////////////////////////////

const { z } = require("zod");
const {
  stringField,
  optionalStringField,
  propertyIdSchema,
  userIdSchema,
  prioritySchema,
  taskStatusSchema,
  paginationSchema,
} = require("./sharedSchemas");

const { TASK_STATUSES } = require("../constants/taskStatuses");
const { PRIORITIES }    = require("../constants/priorities");

//////////////////////////////////////////////////////////
// CREATE TASK SCHEMA
//////////////////////////////////////////////////////////

const createTaskSchema = z.object({

  itemName: stringField("Task name", 255)
    .describe("What needs to be done"),

  description: optionalStringField("Task description", 2000)
    .describe("Detailed instructions or context"),

  priority: prioritySchema
    .describe("Task priority level"),

  propertyId: propertyIdSchema
    .describe("Property scope for task"),

  assignedToId: userIdSchema
    .optional()
    .describe("Optional initial assignment to staff member"),

  dueAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe("ISO 8601 deadline timestamp"),
});

//////////////////////////////////////////////////////////
// UPDATE TASK STATUS SCHEMA
//
// Status must be lowercase — matches DB convention
//////////////////////////////////////////////////////////

const updateTaskStatusSchema = z.object({

  status: taskStatusSchema
    .describe("New task status — must be lowercase"),
});

//////////////////////////////////////////////////////////
// ASSIGN TASK SCHEMA
//////////////////////////////////////////////////////////

const assignTaskSchema = z.object({

  assignedToId: userIdSchema
    .describe("Staff member ID to assign task to"),
});

//////////////////////////////////////////////////////////
// TASK QUERY SCHEMA
//
// All enum values lowercase
//////////////////////////////////////////////////////////

const taskQuerySchema = z.object({

  page:  paginationSchema.shape.page.optional(),
  limit: paginationSchema.shape.limit.optional(),

  status: z
    .enum(Object.values(TASK_STATUSES), {
      invalid_type_error: `Status must be one of: ${Object.values(TASK_STATUSES).join(", ")}`,
    })
    .optional()
    .describe("Filter by task status"),

  priority: z
    .enum(Object.values(PRIORITIES), {
      invalid_type_error: `Priority must be one of: ${Object.values(PRIORITIES).join(", ")}`,
    })
    .optional()
    .describe("Filter by task priority"),

  assignedToId: z
    .string()
    .regex(/^\d+$/, "assignedToId must be a number")
    .transform(Number)
    .optional()
    .describe("Filter by assigned staff member"),
});

//////////////////////////////////////////////////////////
// EXPORTS
//////////////////////////////////////////////////////////

module.exports = {
  createTaskSchema,
  updateTaskStatusSchema,
  assignTaskSchema,
  taskQuerySchema,
};