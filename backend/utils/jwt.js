//////////////////////////////////////////////////////////
// 🔐 JWT UTILITY
//////////////////////////////////////////////////////////
const jwt = require("jsonwebtoken");

//////////////////////////////////////////////////////////
// TOKEN EXPIRY BY ROLE
//////////////////////////////////////////////////////////
const TOKEN_EXPIRY = {
  SUPER_ADMIN: "8h",   // Short — high privilege, should re-authenticate frequently
  ADMIN:       "12h",  // Work shift + buffer
  STAFF:       "10h",  // Covers a full work shift
  GUEST:       "72h",  // 3 days — covers a typical hotel stay
};

//////////////////////////////////////////////////////////
// GENERATE JWT TOKEN
//////////////////////////////////////////////////////////
function generateToken(user) {
  const expiry = TOKEN_EXPIRY[user.role] || "8h"; // safe fallback

  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      propertyId: user.propertyId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: expiry,
    }
  );
}

module.exports = {
  generateToken,
  TOKEN_EXPIRY, // export so authService can reference it if needed
};