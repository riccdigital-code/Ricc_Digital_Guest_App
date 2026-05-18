//////////////////////////////////////////////////////////
// 🛡️ SAFE USER UTILITY
// Strips sensitive fields before sending to client
//
// EXPLICITLY EXCLUDED FIELDS:
//   password — never sent to client under any circumstances
//
// Used by: authRoutes, authService, bookingRoutes,
//          sessionRoutes, propertyRoutes
//////////////////////////////////////////////////////////

function safeUser(user) {

  //////////////////////////////////////////////////////////
  // NULL GUARD
  // Returns null cleanly rather than crashing
  // Callers should check for null in response
  //////////////////////////////////////////////////////////

  if (!user) return null;

  //////////////////////////////////////////////////////////
  // RETURN SAFE FIELDS ONLY
  // password intentionally omitted
  //////////////////////////////////////////////////////////

  return {
    id:         user.id,
    name:       user.name,
    email:      user.email,
    role:       user.role,
    propertyId: user.propertyId,
    createdAt:  user.createdAt,
    updatedAt:  user.updatedAt,
  };
}

module.exports = safeUser;