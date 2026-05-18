//////////////////////////////////////////////////////////
// 🔒 SCOPE BY ROLE UTILITY
// Property isolation helpers for multi-tenant operations
//
// TENANT ISOLATION ARCHITECTURE:
//   ADMIN       — scoped to their propertyId only
//   SUPER_ADMIN — no scope, sees all properties
//   STAFF       — scoped to their propertyId
//   GUEST       — scoped to their propertyId
//
// USED BY:
//   Every route that queries Property-scoped data
//   List endpoints (tasks, calls, bookings, etc.)
//   Single resource endpoints (GET /:id)
//
// PREVENTS:
//   Cross-tenant data leakage
//   Property isolation bypass vulnerabilities
//   Inconsistent scoping logic across routes
//////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////
// GET PROPERTY FILTER FOR PRISMA QUERIES
//
// Returns the WHERE clause filter that should be
// applied to Prisma queries based on user role.
//
// Usage in routes:
//   const filter = getPropertyFilter(req.user);
//   const tasks = await prisma.task.findMany({
//     where: {
//       ...filter,
//       status: "pending",
//     }
//   });
//
// Parameters:
//   user — req.user object from authMiddleware
//
// Returns:
//   ADMIN/STAFF/GUEST → { propertyId: number }
//   SUPER_ADMIN       → {} (empty object, no filter)
//
// Why empty object for SUPER_ADMIN:
//   Prisma ignores empty objects in WHERE clauses.
//   Spreading {} into a where clause adds nothing.
//   This allows the same code to work for all roles
//   without conditional branches in every route.
//////////////////////////////////////////////////////////

function getPropertyFilter(user) {

  //////////////////////////////////////////////////////////
  // GUARD — user must exist
  // authMiddleware guarantees this, but defensive coding
  //////////////////////////////////////////////////////////

  if (!user) {
    throw new Error(
      "getPropertyFilter: user is required. Did you forget authenticate middleware?"
    );
  }

  if (!user.role) {
    throw new Error(
      "getPropertyFilter: user.role is missing. JWT payload may be corrupted."
    );
  }

  //////////////////////////////////////////////////////////
  // SUPER_ADMIN — no property scope
  // Can query across all properties on the platform
  //////////////////////////////////////////////////////////

  if (user.role === "SUPER_ADMIN") {
    return {};
  }

  //////////////////////////////////////////////////////////
  // ALL OTHER ROLES — scoped to their property
  // ADMIN, STAFF, GUEST all have propertyId
  //////////////////////////////////////////////////////////

  if (!user.propertyId) {
    throw new Error(
      `getPropertyFilter: ${user.role} user missing propertyId. User record may be corrupted.`
    );
  }

  return { propertyId: user.propertyId };
}

//////////////////////////////////////////////////////////
// CAN USER ACCESS THIS PROPERTY?
//
// Checks whether a user can access a specific
// property resource. Used in GET /:id routes
// to verify ownership before returning data.
//
// Usage in routes:
//   const task = await prisma.task.findUnique({
//     where: { id: taskId }
//   });
//
//   if (!canAccessProperty(req.user, task.propertyId)) {
//     return res.status(403).json({
//       error: "Access denied",
//       code: "FORBIDDEN",
//     });
//   }
//
// Parameters:
//   user              — req.user
//   resourcePropertyId — the propertyId of the resource
//
// Returns:
//   true  — user can access this property
//   false — user cannot access this property
//
// Logic:
//   SUPER_ADMIN → always true (platform-wide access)
//   Other roles → true only if propertyId matches
//////////////////////////////////////////////////////////

function canAccessProperty(user, resourcePropertyId) {

  //////////////////////////////////////////////////////////
  // GUARD — both parameters required
  //////////////////////////////////////////////////////////

  if (!user) {
    throw new Error("canAccessProperty: user is required");
  }

  if (resourcePropertyId === undefined || resourcePropertyId === null) {
    throw new Error("canAccessProperty: resourcePropertyId is required");
  }

  //////////////////////////////////////////////////////////
  // SUPER_ADMIN — unrestricted platform access
  //////////////////////////////////////////////////////////

  if (user.role === "SUPER_ADMIN") {
    return true;
  }

  //////////////////////////////////////////////////////////
  // ALL OTHER ROLES — must match property
  //////////////////////////////////////////////////////////

  return user.propertyId === resourcePropertyId;
}

//////////////////////////////////////////////////////////
// BUILD FORBIDDEN RESPONSE
//
// Returns a consistent 403 Forbidden response shape
// across all routes.
//
// Usage in routes:
//   if (!canAccessProperty(req.user, resource.propertyId)) {
//     return forbiddenResponse(res);
//   }
//
//   // or with custom message:
//   return forbiddenResponse(res, "You can only view tasks from your property");
//
// Parameters:
//   res     — Express response object
//   message — optional custom message
//
// Returns:
//   Express response (chainable)
//
// Response shape:
//   {
//     error: "message",
//     code: "FORBIDDEN"
//   }
//////////////////////////////////////////////////////////

function forbiddenResponse(
  res,
  message = "You do not have permission to access this resource"
) {
  return res.status(403).json({
    error: message,
    code:  "FORBIDDEN",
  });
}

//////////////////////////////////////////////////////////
// GET SCOPED PROPERTY ID
//
// Returns the propertyId that should be used
// when CREATING a new resource.
//
// This is different from getPropertyFilter because
// creation always uses the user's own propertyId —
// even SUPER_ADMIN cannot create resources for
// other properties without explicit assignment.
//
// Usage in routes:
//   const propertyId = getScopedPropertyId(req.user);
//
//   const task = await prisma.task.create({
//     data: {
//       propertyId,  // ← always user's own property
//       ...otherData,
//     }
//   });
//
// Parameters:
//   user — req.user
//
// Returns:
//   number — the propertyId to use for creation
//
// Throws:
//   Error if user has no propertyId
//   (SUPER_ADMIN without propertyId cannot create scoped resources)
//////////////////////////////////////////////////////////

function getScopedPropertyId(user) {

  if (!user) {
    throw new Error("getScopedPropertyId: user is required");
  }

  if (!user.propertyId) {
    throw new Error(
      `getScopedPropertyId: ${user.role} user has no propertyId. Cannot create property-scoped resources.`
    );
  }

  return user.propertyId;
}

//////////////////////////////////////////////////////////
// REQUIRE PROPERTY ACCESS
//
// Combines canAccessProperty check with automatic
// 403 response if access denied.
//
// Reduces this pattern:
//   if (!canAccessProperty(req.user, resource.propertyId)) {
//     return forbiddenResponse(res, "...");
//   }
//
// To this:
//   requirePropertyAccess(req.user, resource.propertyId, res);
//   // continues only if access allowed
//
// Usage in routes:
//   const task = await prisma.task.findUnique({ where: { id } });
//   requirePropertyAccess(req.user, task.propertyId, res);
//
// Parameters:
//   user              — req.user
//   resourcePropertyId — propertyId of the resource
//   res               — Express response object
//   message           — optional custom error message
//
// Returns:
//   undefined if access allowed (route continues)
//   Sends 403 response if access denied (halts route)
//
// Note: This function MUST be used with return:
//   return requirePropertyAccess(...) || continueRouteLogic();
//
//   Or checked:
//   if (!requirePropertyAccess(...)) return;
//////////////////////////////////////////////////////////

function requirePropertyAccess(
  user,
  resourcePropertyId,
  res,
  message = "You can only access resources from your property"
) {

  if (!canAccessProperty(user, resourcePropertyId)) {
    forbiddenResponse(res, message);
    return false;
  }

  return true;
}

//////////////////////////////////////////////////////////
// EXPORTS
//////////////////////////////////////////////////////////

module.exports = {

  //////////////////////////////////////////////////////////
  // PRIMARY FUNCTIONS — use these in routes
  //////////////////////////////////////////////////////////

  getPropertyFilter,
  canAccessProperty,
  forbiddenResponse,
  getScopedPropertyId,

  //////////////////////////////////////////////////////////
  // CONVENIENCE FUNCTION
  //////////////////////////////////////////////////////////

  requirePropertyAccess,
};