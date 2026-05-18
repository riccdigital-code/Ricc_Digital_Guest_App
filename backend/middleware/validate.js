//////////////////////////////////////////////////////////
// ✅ VALIDATION MIDDLEWARE
// Zod schema validation for Express routes
//
// PURPOSE:
//   Centralized validation middleware that prevents
//   malformed requests from reaching controllers.
//
// USAGE:
//   const { validate } = require("../middleware/validate");
//   router.post("/", validate(createTaskSchema), controller.create);
//
// BEHAVIOR:
//   - Validates req.body against provided schema
//   - Returns 400 with field errors on validation failure
//   - Attaches validated data to req.validated on success
//   - Never throws — always returns response
//////////////////////////////////////////////////////////

/**
 * Create validation middleware for a Zod schema
 *
 * @param {ZodSchema} schema — Zod schema to validate against
 * @returns {Function} Express middleware function
 *
 * Middleware validates req.body using schema.safeParse()
 * On failure: returns 400 with field error details
 * On success: attaches validated data to req.validated
 */

function validate(schema) {
  return (req, res, next) => {

    //////////////////////////////////////////////////////////
    // VALIDATE REQUEST BODY AGAINST SCHEMA
    // safeParse never throws — returns success/failure result
    //////////////////////////////////////////////////////////

    const result = schema.safeParse(req.body);

    //////////////////////////////////////////////////////////
    // VALIDATION FAILED — return error response
    //////////////////////////////////////////////////////////

    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        fields: result.error.errors.map((e) => ({
          field: e.path.join(".") || "unknown",
          message: e.message,
        })),
      });
    }

    //////////////////////////////////////////////////////////
    // VALIDATION SUCCEEDED — attach to request and continue
    // Controller can access validated data via req.validated
    //////////////////////////////////////////////////////////

    req.validated = result.data;
    next();
  };
}

//////////////////////////////////////////////////////////
// EXPORTS
//////////////////////////////////////////////////////////

module.exports = { validate };
