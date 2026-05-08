//////////////////////////////////////////////////////////
// 🛡️ SAFE USER UTILITY
// Removes sensitive fields before sending responses
//////////////////////////////////////////////////////////

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    propertyId: user.propertyId,
    createdAt: user.createdAt,
  };
}

module.exports = safeUser;