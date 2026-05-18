//////////////////////////////////////////////////////////
// 🛡️ ROLE AUTHORIZATION MIDDLEWARE
//////////////////////////////////////////////////////////

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {

    //////////////////////////////////////////////////////////
    // STEP 1 — VERIFY req.user EXISTS
    // This only fires if roleMiddleware is used WITHOUT
    // authenticate middleware before it — a developer mistake.
    // Guards against misconfigured route chains.
    //////////////////////////////////////////////////////////

    if (!req.user) {
      console.error("❌ roleMiddleware called without authenticate middleware");

      return res.status(401).json({
        error: "Unauthorized. Authentication required.",
        code: "NO_USER",
      });
    }

    //////////////////////////////////////////////////////////
    // STEP 2 — VERIFY allowedRoles WERE ACTUALLY PROVIDED
    // Guards against: authorizeRoles() called with no arguments
    // which would silently block EVERY role including SUPER_ADMIN
    //////////////////////////////////////////////////////////

    if (!allowedRoles || allowedRoles.length === 0) {
      console.error("❌ authorizeRoles() called with no roles defined");

      return res.status(500).json({
        error: "Server misconfiguration. Contact support.",
        code: "MISCONFIGURED_ROLES",
      });
    }

    //////////////////////////////////////////////////////////
    // STEP 3 — CHECK IF USER ROLE IS PERMITTED
    //////////////////////////////////////////////////////////

    if (!allowedRoles.includes(req.user.role)) {

      //////////////////////////////////////////////////////////
      // LOG REJECTION FOR SERVER-SIDE AUDIT TRAIL
      // Useful for catching privilege escalation attempts
      //////////////////////////////////////////////////////////

      console.warn(
        `🚫 Access denied | User ID: ${req.user.id} | Role: ${req.user.role} | Required: [${allowedRoles.join(", ")}] | Property: ${req.user.propertyId}`
      );

      //////////////////////////////////////////////////////////
      // DEVELOPMENT — Include debug context in response
      //////////////////////////////////////////////////////////

      if (process.env.NODE_ENV === "development") {
        return res.status(403).json({
          error: "You do not have permission to access this resource",
          code: "FORBIDDEN",
          debug: {
            currentRole: req.user.role,
            requiredRoles: allowedRoles,
            userId: req.user.id,
          },
        });
      }

      //////////////////////////////////////////////////////////
      // PRODUCTION — Clean response, no internal details exposed
      //////////////////////////////////////////////////////////

      return res.status(403).json({
        error: "You do not have permission to access this resource",
        code: "FORBIDDEN",
      });
    }

    //////////////////////////////////////////////////////////
    // STEP 4 — ROLE PERMITTED, CONTINUE TO CONTROLLER
    //////////////////////////////////////////////////////////

    next();
  };
}

module.exports = authorizeRoles;