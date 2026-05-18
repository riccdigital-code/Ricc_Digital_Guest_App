//////////////////////////////////////////////////////////
// 🔐 AUTH MIDDLEWARE
//////////////////////////////////////////////////////////

const jwt = require("jsonwebtoken");
const { verifyToken } = require("../utils/jwt");

async function authenticate(req, res, next) {
  try {

    //////////////////////////////////////////////////////////
    // STEP 1 — READ AUTHORIZATION HEADER
    //////////////////////////////////////////////////////////

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "No token provided",
        code: "NO_TOKEN",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Invalid authorization format. Use: Bearer <token>",
        code: "INVALID_AUTH_FORMAT",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token || token.trim() === "") {
      return res.status(401).json({
        error: "Token missing from authorization header",
        code: "TOKEN_MISSING",
      });
    }

    //////////////////////////////////////////////////////////
    // STEP 2 — DECODE WITHOUT VERIFYING
    // Extract role to determine which secret to use
    // decode() does NOT verify signature — safe for role peek only
    //////////////////////////////////////////////////////////

    const decoded = jwt.decode(token);

    if (!decoded || !decoded.role) {
      return res.status(401).json({
        error: "Invalid token structure",
        code: "TOKEN_INVALID",
      });
    }

    //////////////////////////////////////////////////////////
    // STEP 3 — VERIFY WITH ROLE-SPECIFIC SECRET
    // Now we know the role, use its dedicated secret
    // If role was tampered with in the token,
    // verification fails here — signature mismatch
    //////////////////////////////////////////////////////////

    const verified = verifyToken(token, decoded.role);

    //////////////////////////////////////////////////////////
    // STEP 4 — ATTACH VERIFIED USER TO REQUEST
    //////////////////////////////////////////////////////////

    req.user = verified;

    next();

  } catch (error) {

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired. Please log in again.",
        code: "TOKEN_EXPIRED",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token",
        code: "TOKEN_INVALID",
      });
    }

    console.error("❌ Auth middleware unexpected error:", error);

    return res.status(401).json({
      error: "Authentication failed",
      code: "AUTH_FAILED",
    });
  }
}

module.exports = authenticate;