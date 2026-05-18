//////////////////////////////////////////////////////////
// 📞 CALL VALIDATOR
// Zod v3 — aligned to CallLog schema and callService
//
// FIELD ALIGNMENT:
//   Schema has:    propertyId, roomNumber, phone, urgency, callType, notes
//   Validator has: propertyId, roomNumber, phone, callType, notes
//   Service uses:  propertyId, roomNumber, phone, urgency (derived from callType)
//
// URGENCY:
//   Not an input field — derived from callType in callService
//   EMERGENCY → high, everything else → normal/low
//   callService.resolvePriorityFromCallType() handles this
//////////////////////////////////////////////////////////

const { z } = require("zod");
const {
  propertyIdSchema,
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

  //////////////////////////////////////////////////////////
  // propertyId — multi-tenant boundary
  // Route verifies this matches req.user.propertyId for GUEST
  //////////////////////////////////////////////////////////

  propertyId: propertyIdSchema
    .describe("Property scope for call"),

  //////////////////////////////////////////////////////////
  // roomNumber — string display identifier
  // Matches CallLog.roomNumber in schema
  //////////////////////////////////////////////////////////

  roomNumber: roomNumberSchema
    .describe("Room number the call originates from"),

  //////////////////////////////////////////////////////////
  // callType — operational category
  // Determines priority in routing engine
  //////////////////////////////////////////////////////////

  callType: callTypeSchema
    .describe("Call type determines routing priority"),

  //////////////////////////////////////////////////////////
  // phone — optional contact number
  // Matches CallLog.phone in schema
  //////////////////////////////////////////////////////////

  phone: phoneNumberSchema
    .describe("Contact phone number"),

  //////////////////////////////////////////////////////////
  // notes — optional context
  //////////////////////////////////////////////////////////

  notes: optionalStringField("Call notes", 1000)
    .describe("Additional context or instructions"),
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