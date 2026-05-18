//////////////////////////////////////////////////////////
// 🔐 SAFE SESSION UTILITY
// Defensive session/user extraction from Express requests
//
// MULTI-FLOW ARCHITECTURE:
//   AUTHENTICATED    — JWT token → req.user populated
//   GUEST QR         — QR session → req.session.guestSessionId
//   ROOM-SCOPED      — Room context → req.session.roomId
//   TEMPORARY        — Transient flows → req.session.tempContext
//   ANONYMOUS        — No auth required → null-safe defaults
//
// USED BY:
//   All route handlers requiring session context
//   Socket.IO event handlers
//   Middleware that needs safe session access
//   Future guest QR flow implementations
//
// PREVENTS:
//   Undefined property access errors (.userId → null)
//   Application crashes from malformed session state
//   Inconsistent session shape across requests
//   Invalid property access on missing objects
//   Type coercion bugs from missing validation
//
// GUARANTEES:
//   Always returns an object matching SafeSession shape
//   Never returns undefined or null (returns object)
//   Never throws for missing/malformed input
//   All properties safe to access without guards
//////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////
// SAFE SESSION OBJECT SHAPE
//
// This is the contract guaranteed by getSafeSession()
// All properties are safe to access directly.
// No property will ever be undefined.
// Null values explicitly indicate missing data.
//////////////////////////////////////////////////////////

/**
 * @typedef {Object} SafeSession
 * @property {boolean} isAuthenticated - Whether user is authenticated via JWT
 * @property {string|null} userId - Authenticated user ID (null if guest)
 * @property {string|null} role - User role (ADMIN, STAFF, GUEST, SUPER_ADMIN)
 * @property {string|null} propertyId - Property scope (null if multi-property or guest)
 * @property {string|null} roomId - Room context (null if not room-scoped)
 * @property {string|null} guestSessionId - Guest QR session identifier (null if authenticated)
 */

//////////////////////////////////////////////////////////
// EXTRACT SAFE SESSION FROM REQUEST
//
// Safely extracts and normalizes session/user information
// from incoming Express request without risking undefined
// property access or runtime errors.
//
// Defensive against:
//   - req.user undefined
//   - req.session undefined
//   - Malformed JWT payloads
//   - Missing required properties
//   - Type mismatches
//   - Null/undefined in nested access
//
// Usage in routes:
//   const session = getSafeSession(req);
//   if (session.isAuthenticated) {
//     // use session.userId, session.role, etc.
//   } else if (session.guestSessionId) {
//     // handle guest QR flow
//   }
//
// Usage in middleware:
//   const session = getSafeSession(req);
//   req.safeSession = session; // attach for downstream use
//
// Parameters:
//   req — Express request object (required)
//
// Returns:
//   SafeSession — normalized session object
//   - Always returns an object (never null/undefined)
//   - All properties present and safe to access
//   - Null values indicate missing data (not errors)
//
// Safety guarantees:
//   ✓ No runtime errors from undefined access
//   ✓ Consistent object shape across all flows
//   ✓ Type-safe property access
//   ✓ Graceful fallbacks for missing data
//////////////////////////////////////////////////////////

function getSafeSession(req) {

  //////////////////////////////////////////////////////////
  // GUARD — request must exist
  //////////////////////////////////////////////////////////

  if (!req || typeof req !== "object") {
    return getEmptySession();
  }

  //////////////////////////////////////////////////////////
  // EXTRACT AUTHENTICATED USER
  //
  // req.user is set by authMiddleware on successful JWT
  // Defensive: check type, verify structure, handle corrupted
  //////////////////////////////////////////////////////////

  const user = extractUserSafely(req.user);

  //////////////////////////////////////////////////////////
  // EXTRACT GUEST SESSION
  //
  // req.session can be undefined if sessions not configured
  // or if request doesn't have session context
  //////////////////////////////////////////////////////////

  const guestSessionId = extractGuestSessionIdSafely(req.session);

  //////////////////////////////////////////////////////////
  // BUILD SAFE SESSION OBJECT
  //////////////////////////////////////////////////////////

  return {
    isAuthenticated: user.userId !== null,
    userId: user.userId,
    role: user.role,
    propertyId: user.propertyId,
    roomId: extractRoomIdSafely(req.session),
    guestSessionId,
  };
}

//////////////////////////////////////////////////////////
// EXTRACT USER SAFELY
//
// Handles malformed/missing req.user and validates
// all required properties exist with correct types.
//
// Parameters:
//   user — req.user (may be undefined)
//
// Returns:
//   {
//     userId: string|null,
//     role: string|null,
//     propertyId: string|null
//   }
//////////////////////////////////////////////////////////

function extractUserSafely(user) {

  //////////////////////////////////////////////////////////
  // GUARD — user must be object
  // If not authenticated, all fields null
  //////////////////////////////////////////////////////////

  if (!user || typeof user !== "object") {
    return {
      userId: null,
      role: null,
      propertyId: null,
    };
  }

  //////////////////////////////////////////////////////////
  // EXTRACT userId — must be string or number
  // JWT payload may be corrupted or missing
  //////////////////////////////////////////////////////////

  let userId = null;
  if (typeof user.id === "string" || typeof user.id === "number") {
    userId = String(user.id).trim() || null;
  } else if (typeof user.userId === "string" || typeof user.userId === "number") {
    userId = String(user.userId).trim() || null;
  }

  //////////////////////////////////////////////////////////
  // EXTRACT role — must be string
  // Whitelist common roles, reject invalid
  //////////////////////////////////////////////////////////

  let role = null;
  if (typeof user.role === "string") {
    const validRoles = ["ADMIN", "STAFF", "GUEST", "SUPER_ADMIN"];
    if (validRoles.includes(user.role.toUpperCase())) {
      role = user.role.toUpperCase();
    }
  }

  //////////////////////////////////////////////////////////
  // EXTRACT propertyId — must be string or number
  // Multi-property safe: null if missing
  //////////////////////////////////////////////////////////

  let propertyId = null;
  if (typeof user.propertyId === "string" || typeof user.propertyId === "number") {
    propertyId = String(user.propertyId).trim() || null;
  }

  return {
    userId,
    role,
    propertyId,
  };
}

//////////////////////////////////////////////////////////
// EXTRACT GUEST SESSION ID SAFELY
//
// Handles missing req.session and validates
// guestSessionId is present and valid string.
//
// Parameters:
//   session — req.session (may be undefined)
//
// Returns:
//   string|null
//////////////////////////////////////////////////////////

function extractGuestSessionIdSafely(session) {

  //////////////////////////////////////////////////////////
  // GUARD — session must exist
  //////////////////////////////////////////////////////////

  if (!session || typeof session !== "object") {
    return null;
  }

  //////////////////////////////////////////////////////////
  // EXTRACT guestSessionId
  // Must be non-empty string
  //////////////////////////////////////////////////////////

  if (typeof session.guestSessionId === "string") {
    const trimmed = session.guestSessionId.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

//////////////////////////////////////////////////////////
// EXTRACT ROOM ID SAFELY
//
// Handles room-scoped sessions for future expansion.
// May come from req.session.roomId or req.params.roomId
//
// Parameters:
//   session — req.session (may be undefined)
//
// Returns:
//   string|null
//////////////////////////////////////////////////////////

function extractRoomIdSafely(session) {

  //////////////////////////////////////////////////////////
  // GUARD — session must exist
  //////////////////////////////////////////////////////////

  if (!session || typeof session !== "object") {
    return null;
  }

  //////////////////////////////////////////////////////////
  // EXTRACT roomId
  // Must be non-empty string
  //////////////////////////////////////////////////////////

  if (typeof session.roomId === "string") {
    const trimmed = session.roomId.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

//////////////////////////////////////////////////////////
// GET EMPTY SESSION
//
// Returns a SafeSession object with all fields null.
// Used as fallback for malformed/missing requests.
//
// Returns:
//   SafeSession (all fields null, isAuthenticated: false)
//////////////////////////////////////////////////////////

function getEmptySession() {
  return {
    isAuthenticated: false,
    userId: null,
    role: null,
    propertyId: null,
    roomId: null,
    guestSessionId: null,
  };
}

//////////////////////////////////////////////////////////
// IS USER AUTHENTICATED
//
// Convenience check for whether user is authenticated.
//
// Usage in routes:
//   const session = getSafeSession(req);
//   if (!isAuthenticated(session)) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }
//
// Parameters:
//   session — SafeSession object
//
// Returns:
//   boolean
//////////////////////////////////////////////////////////

function isAuthenticated(session) {
  if (!session || typeof session !== "object") {
    return false;
  }
  return session.isAuthenticated === true && session.userId !== null;
}

//////////////////////////////////////////////////////////
// IS GUEST SESSION
//
// Convenience check for whether session is guest QR flow.
//
// Usage in routes:
//   const session = getSafeSession(req);
//   if (isGuestSession(session)) {
//     // guest-only logic
//   }
//
// Parameters:
//   session — SafeSession object
//
// Returns:
//   boolean
//////////////////////////////////////////////////////////

function isGuestSession(session) {
  if (!session || typeof session !== "object") {
    return false;
  }
  return session.guestSessionId !== null && session.isAuthenticated === false;
}

//////////////////////////////////////////////////////////
// REQUIRE AUTHENTICATION
//
// Middleware-style check that returns Express response
// if user is not authenticated.
//
// Usage in routes:
//   const session = getSafeSession(req);
//   if (requireAuth(session, res)) {
//     return;  // not authenticated, response sent
//   }
//
// Or check result:
//   if (!requireAuth(session, res)) {
//     // user is authenticated, continue
//   }
//
// Parameters:
//   session — SafeSession object
//   res — Express response object
//   message — optional custom error message
//
// Returns:
//   true if access denied (response sent)
//   false if access allowed (continue)
//////////////////////////////////////////////////////////

function requireAuth(
  session,
  res,
  message = "Authentication required"
) {

  if (!isAuthenticated(session)) {
    res.status(401).json({
      error: message,
      code: "UNAUTHORIZED",
    });
    return true;
  }

  return false;
}

//////////////////////////////////////////////////////////
// VALIDATE SESSION ROLE
//
// Checks whether session user has one of allowed roles.
//
// Usage in routes:
//   const session = getSafeSession(req);
//   if (!validateRole(session, ["ADMIN", "STAFF"])) {
//     return res.status(403).json({ error: "Forbidden" });
//   }
//
// Parameters:
//   session — SafeSession object
//   allowedRoles — array of role strings
//
// Returns:
//   boolean — true if user role is in allowedRoles
//////////////////////////////////////////////////////////

function validateRole(session, allowedRoles) {

  if (!session || !Array.isArray(allowedRoles)) {
    return false;
  }

  if (!session.role) {
    return false;
  }

  return allowedRoles.includes(session.role);
}

//////////////////////////////////////////////////////////
// EXPORTS
//////////////////////////////////////////////////////////

module.exports = {

  //////////////////////////////////////////////////////////
  // PRIMARY FUNCTION — use this in all route handlers
  //////////////////////////////////////////////////////////

  getSafeSession,

  //////////////////////////////////////////////////////////
  // CONVENIENCE HELPERS
  //////////////////////////////////////////////////////////

  isAuthenticated,
  isGuestSession,
  requireAuth,
  validateRole,

  //////////////////////////////////////////////////////////
  // INTERNAL HELPERS (for testing)
  //////////////////////////////////////////////////////////

  extractUserSafely,
  extractGuestSessionIdSafely,
  extractRoomIdSafely,
  getEmptySession,
};
