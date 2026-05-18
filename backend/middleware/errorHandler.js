//////////////////////////////////////////////////////////
// 🛡️ GLOBAL ERROR HANDLER
// Applied in server.js AFTER all routes
// Catches any unhandled errors that reach Express
// Must have 4 parameters — Express identifies error
// middleware by the (err, req, res, next) signature
//////////////////////////////////////////////////////////

function globalErrorHandler(err, req, res, next) {

  //////////////////////////////////////////////////////////
  // LOG FULL CONTEXT FOR SERVER-SIDE DEBUGGING
  // Never expose stack traces to the client
  //////////////////////////////////////////////////////////

  console.error("❌ Unhandled error:", {
    message:  err.message,
    path:     req.path,
    method:   req.method,
    userId:   req.user?.id    || "unauthenticated",
    role:     req.user?.role  || "none",
    stack:    process.env.NODE_ENV === "development"
                ? err.stack
                : undefined,
  });

  //////////////////////////////////////////////////////////
  // PRISMA ERROR CODES
  // Map database errors to correct HTTP responses
  //////////////////////////////////////////////////////////

  if (err.code === "P2002") {
    return res.status(409).json({
      error: "A record with this value already exists",
      code:  "DUPLICATE_RECORD",
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      error: "Record not found",
      code:  "NOT_FOUND",
    });
  }

  if (err.code === "P2003") {
    return res.status(400).json({
      error: "Related record not found",
      code:  "FOREIGN_KEY_ERROR",
    });
  }

  if (err.code === "P2014") {
    return res.status(400).json({
      error: "Relation violation",
      code:  "RELATION_ERROR",
    });
  }

  if (err.code === "P1001") {
    return res.status(503).json({
      error: "Database unreachable. Please try again shortly.",
      code:  "DATABASE_UNAVAILABLE",
    });
  }

  //////////////////////////////////////////////////////////
  // ZOD VALIDATION ERRORS
  // Safety net — should be caught in routes first
  //////////////////////////////////////////////////////////

  if (err.name === "ZodError") {
    return res.status(400).json({
      error:  "Validation failed",
      code:   "VALIDATION_ERROR",
      fields: err.errors?.map((e) => ({
        field:   e.path?.[0] || "unknown",
        message: e.message,
      })),
    });
  }

  //////////////////////////////////////////////////////////
  // JWT ERRORS
  // Safety net — should be caught in authMiddleware first
  //////////////////////////////////////////////////////////

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid token",
      code:  "TOKEN_INVALID",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Token expired. Please log in again.",
      code:  "TOKEN_EXPIRED",
    });
  }

  //////////////////////////////////////////////////////////
  // KNOWN BUSINESS LOGIC ERRORS
  // Thrown explicitly in services and routes
  //////////////////////////////////////////////////////////

  const knownErrors = {
    "Email already exists":    409,
    "Invalid credentials":     401,
    "Account not found":       404,
    "User not found":          404,
    "Property not found":      404,
    "Room not found":          404,
    "Task not found":          404,
    "Session not found":       404,
  };

  if (knownErrors[err.message]) {
    return res.status(knownErrors[err.message]).json({
      error: err.message,
    });
  }

  //////////////////////////////////////////////////////////
  // SYNTAX ERROR IN REQUEST BODY
  // Malformed JSON sent by client
  //////////////////////////////////////////////////////////

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "Invalid JSON in request body",
      code:  "INVALID_JSON",
    });
  }

  //////////////////////////////////////////////////////////
  // DEFAULT — UNKNOWN SERVER ERROR
  // Never expose raw error details in production
  //////////////////////////////////////////////////////////

  const message =
    process.env.NODE_ENV === "development"
      ? err.message
      : "An unexpected error occurred. Please try again.";

  res.status(500).json({
    error: message,
    code:  "INTERNAL_ERROR",
  });
}

module.exports = globalErrorHandler;