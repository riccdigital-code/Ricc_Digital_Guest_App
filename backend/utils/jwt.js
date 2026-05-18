//////////////////////////////////////////////////////////
// 🔐 JWT UTILITY
// Role-separated secrets + role-based expiry
//////////////////////////////////////////////////////////

const jwt = require("jsonwebtoken");

//////////////////////////////////////////////////////////
// TOKEN EXPIRY BY ROLE
//////////////////////////////////////////////////////////

const TOKEN_EXPIRY = {
  SUPER_ADMIN: "8h",
  ADMIN:       "12h",
  STAFF:       "10h",
  GUEST:       "72h",
};

//////////////////////////////////////////////////////////
// SECRET BY ROLE
// Each role has its own signing secret.
// A compromised GUEST secret does not affect STAFF.
// A compromised STAFF secret does not affect ADMIN.
//////////////////////////////////////////////////////////

function getSecretForRole(role) {
  const secrets = {
    SUPER_ADMIN: process.env.JWT_SECRET_SUPER_ADMIN,
    ADMIN:       process.env.JWT_SECRET_ADMIN,
    STAFF:       process.env.JWT_SECRET_STAFF,
    GUEST:       process.env.JWT_SECRET_GUEST,
  };

  const secret = secrets[role];

  //////////////////////////////////////////////////////////
  // GUARD — missing secret is a misconfiguration
  // Fail loudly rather than fall back to weak default
  //////////////////////////////////////////////////////////

  if (!secret) {
    throw new Error(
      `JWT secret not configured for role: ${role}. Check your .env file.`
    );
  }

  return secret;
}

//////////////////////////////////////////////////////////
// GENERATE JWT TOKEN
//////////////////////////////////////////////////////////

function generateToken(user) {
  const secret = getSecretForRole(user.role);
  const expiry = TOKEN_EXPIRY[user.role] || "8h";

  return jwt.sign(
    {
      id:         user.id,
      role:       user.role,
      propertyId: user.propertyId,
    },
    secret,
    {
      expiresIn: expiry,
    }
  );
}

//////////////////////////////////////////////////////////
// VERIFY JWT TOKEN
// Must use the correct secret for the role
// A GUEST token cannot be verified with STAFF secret
//////////////////////////////////////////////////////////

function verifyToken(token, role) {
  const secret = getSecretForRole(role);
  return jwt.verify(token, secret);
}

module.exports = {
  generateToken,
  verifyToken,
  TOKEN_EXPIRY,
};