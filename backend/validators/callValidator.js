//////////////////////////////////////////////////////////
// 📞 CALL VALIDATOR
// Zod v3 — aligned to CallLog schema and callService
//
// FIELD ALIGNMENT:
//   Schema has:    propertyId, roomNumber, phone, urgency, callType, notes
//   Validator has: roomNumber, callType, phone, notes
//   Service uses:  roomNumber, callType, phone, notes
//                  propertyId from JWT token only
//
// URGENCY:
//   Not an input field — derived from callType in callService
//   EMERGENCY → high, everything else → normal/low
//   callService.resolvePriorityFromCallType() handles this
//////////////////////////////////////////////////////////

const { z } = require("zod");
const {
  roomNumberSchema,
  phoneNumberSchema,
  callTypeSchema,
  callStatusSchema,
  paginationSchema,
  optionalStringField,
} = require("./sharedSchemas");

//////////////////////////////////////////////////////////
// CREATE CALL SCHEMA
//
// Fields aligned to CallLog model in schema.prisma
// urgency derived from callType in service layer
//////////////////////////////////////////////////////////

const createCallSchema = z.object({

  roomNumber: roomNumberSchema
    .describe("Room number the call originates from"),

  callType: callTypeSchema
    .describe("Call type determines routing priority"),

  phone: phoneNumberSchema
    .describe("Contact phone number"),

  notes: optionalStringField("Call notes", 1000)
    .describe("Additional context or instructions"),

  // propertyId REMOVED — comes from JWT token only
  // callService uses user.propertyId exclusively
});

//////////////////////////////////////////////////////////
// UPDATE CALL STATUS SCHEMA
//////////////////////////////////////////////////////////

const updateCallStatusSchema = z.object({

  status: callStatusSchema
    .describe("New call status"),
});

//////////////////////////////////////////////////////////
// CALL QUERY SCHEMA
// Validates GET /api/calls query parameters
//////////////////////////////////////////////////////////

const callQuerySchema = z.object({

  page:  paginationSchema.shape.page.optional(),
  limit: paginationSchema.shape.limit.optional(),

  status: callStatusSchema
    .optional()
    .describe("Filter by call status"),

  callType: callTypeSchema
    .optional()
    .describe("Filter by call type"),

  unresolved: z
    .enum(["true", "false"], {
      invalid_type_error: "unresolved must be true or false",
    })
    .optional()
    .describe("Filter to unresolved calls only"),
});

//////////////////////////////////////////////////////////
// EXPORTS
//////////////////////////////////////////////////////////

module.exports = {
  createCallSchema,
  updateCallStatusSchema,
  callQuerySchema,
};