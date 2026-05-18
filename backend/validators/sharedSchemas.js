//////////////////////////////////////////////////////////
// 🔧 SHARED SCHEMA FRAGMENTS
// Reusable Zod v3 schemas for RiccDigital validators
//
// PURPOSE:
//   Single source of truth for common validation logic
//   All enums import from constants/ — never hardcoded
//   Prevents drift across validators
//
// USED BY:
//   validators/authValidator.js
//   validators/callValidator.js
//   validators/taskValidator.js
//////////////////////////////////////////////////////////

const { z } = require("zod");

const { TASK_STATUSES }          = require("../constants/taskStatuses");
const { PRIORITIES }             = require("../constants/priorities");
const { CALL_TYPES }             = require("../constants/callTypes");

//////////////////////////////////////////////////////////
// EMAIL SCHEMA
//////////////////////////////////////////////////////////

const emailSchema = z
  .string({
    required_error:    "Email is required",
    invalid_type_error: "Email must be a string",
  })
  .email("Invalid email format")
  .max(255, "Email is too long")
  .trim()
  .toLowerCase();

//////////////////////////////////////////////////////////
// PASSWORD SCHEMA
//
// Requirements:
//   - minimum 8 characters
//   - at least one number
//   - max 128 characters
//////////////////////////////////////////////////////////

const passwordSchema = z
  .string({
    required_error:    "Password is required",
    invalid_type_error: "Password must be a string",
  })
  .min(8,   "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(
    /(?=.*[0-9])/,
    "Password must contain at least one number"
  );

//////////////////////////////////////////////////////////
// ROLE SCHEMA
// Used internally — public register restricts to ADMIN/STAFF
//////////////////////////////////////////////////////////

const roleSchema = z
  .enum(["ADMIN", "STAFF", "GUEST", "SUPER_ADMIN"], {
    required_error:    "Role is required",
    invalid_type_error: "Role must be ADMIN, STAFF, GUEST, or SUPER_ADMIN",
  });

//////////////////////////////////////////////////////////
// PROPERTY ID SCHEMA
//////////////////////////////////////////////////////////

const propertyIdSchema = z
  .number({
    invalid_type_error: "propertyId must be a number",
  })
  .int("propertyId must be a whole number")
  .positive("propertyId must be positive");

//////////////////////////////////////////////////////////
// ROOM ID SCHEMA
// Integer FK to Room table
//////////////////////////////////////////////////////////

const roomIdSchema = z
  .number({
    invalid_type_error: "roomId must be a number",
  })
  .int("roomId must be a whole number")
  .positive("roomId must be positive");

//////////////////////////////////////////////////////////
// ROOM NUMBER SCHEMA
// String display identifier — "101", "202"
//////////////////////////////////////////////////////////

const roomNumberSchema = z
  .string({
    required_error:    "roomNumber is required",
    invalid_type_error: "roomNumber must be a string",
  })
  .min(1,  "roomNumber cannot be empty")
  .max(20, "roomNumber is too long")
  .trim();

//////////////////////////////////////////////////////////
// USER ID SCHEMA
//////////////////////////////////////////////////////////

const userIdSchema = z
  .number({
    invalid_type_error: "User ID must be a number",
  })
  .int("User ID must be a whole number")
  .positive("User ID must be positive");

//////////////////////////////////////////////////////////
// PRIORITY SCHEMA
// Imports from constants — never hardcoded
//////////////////////////////////////////////////////////

const prioritySchema = z
  .enum(Object.values(PRIORITIES) , {
    required_error:    "Priority is required",
    invalid_type_error: `Priority must be one of: ${Object.values(PRIORITIES).join(", ")}`,
  })
  .default(PRIORITIES.NORMAL);

//////////////////////////////////////////////////////////
// TASK STATUS SCHEMA
// Imports from constants — lowercase everywhere
//////////////////////////////////////////////////////////

const taskStatusSchema = z
  .enum(Object.values(TASK_STATUSES), {
    required_error:    "Task status is required",
    invalid_type_error: `Status must be one of: ${Object.values(TASK_STATUSES).join(", ")}`,
  });

//////////////////////////////////////////////////////////
// CALL STATUS SCHEMA
//////////////////////////////////////////////////////////

const callStatusSchema = z
  .enum(["pending", "active", "missed", "completed", "cancelled"], {
    required_error:    "Call status is required",
    invalid_type_error: "Invalid call status",
  });

//////////////////////////////////////////////////////////
// CALL TYPE SCHEMA
// Imports from constants
//////////////////////////////////////////////////////////

const callTypeSchema = z
  .enum(Object.values(CALL_TYPES), {
    required_error:    "Call type is required",
    invalid_type_error: `Call type must be one of: ${Object.values(CALL_TYPES).join(", ")}`,
  });

//////////////////////////////////////////////////////////
// PAGINATION SCHEMA
//////////////////////////////////////////////////////////

const paginationSchema = z.object({

  page: z
    .string()
    .regex(/^\d+$/, "Page must be a number")
    .transform(Number)
    .refine(n => n >= 1, "Page must be at least 1")
    .optional()
    .default("1"),

  limit: z
    .string()
    .regex(/^\d+$/, "Limit must be a number")
    .transform(Number)
    .refine(n => n >= 1,   "Limit must be at least 1")
    .refine(n => n <= 500, "Limit cannot exceed 500")
    .optional()
    .default("20"),

  sortBy: z
    .string()
    .max(50, "Sort field name too long")
    .optional(),

  sortOrder: z
    .enum(["asc", "desc"], {
      invalid_type_error: "Sort order must be asc or desc",
    })
    .optional()
    .default("asc"),
});

//////////////////////////////////////////////////////////
// PHONE NUMBER SCHEMA
//////////////////////////////////////////////////////////

const phoneNumberSchema = z
  .string({
    invalid_type_error: "Phone number must be a string",
  })
  .regex(
    /^[+]?[0-9\s\-().]{7,20}$/,
    "Invalid phone number format"
  )
  .optional();

//////////////////////////////////////////////////////////
// STRING FIELD FACTORY
//////////////////////////////////////////////////////////

function stringField(fieldName = "Text", maxLength = 255) {
  return z
    .string({
      required_error:    `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a string`,
    })
    .min(1,         `${fieldName} cannot be empty`)
    .max(maxLength, `${fieldName} is too long`)
    .trim();
}

//////////////////////////////////////////////////////////
// OPTIONAL STRING FIELD FACTORY
//////////////////////////////////////////////////////////

function optionalStringField(fieldName = "Text", maxLength = 1000) {
  return z
    .string({
      invalid_type_error: `${fieldName} must be a string`,
    })
    .max(maxLength, `${fieldName} is too long`)
    .trim()
    .optional()
    .nullable();
}

//////////////////////////////////////////////////////////
// EXPORTS
//////////////////////////////////////////////////////////

module.exports = {
  emailSchema,
  passwordSchema,
  roleSchema,
  propertyIdSchema,
  roomIdSchema,
  roomNumberSchema,
  userIdSchema,
  prioritySchema,
  taskStatusSchema,
  callStatusSchema,
  callTypeSchema,
  paginationSchema,
  phoneNumberSchema,
  stringField,
  optionalStringField,
};