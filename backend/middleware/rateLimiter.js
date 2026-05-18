//////////////////////////////////////////////////////////
// 🛡️ RATE LIMITERS
//////////////////////////////////////////////////////////

const rateLimit = require("express-rate-limit");

//////////////////////////////////////////////////////////
// 🔐 LOGIN LIMITER
//////////////////////////////////////////////////////////

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error:
      "Too many login attempts. Please try again in 15 minutes.",
  },
});

//////////////////////////////////////////////////////////
// 📝 REGISTER LIMITER
//////////////////////////////////////////////////////////

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error:
      "Too many accounts created from this IP. Please try again later.",
  },
});

//////////////////////////////////////////////////////////
// 🌐 GLOBAL API LIMITER
//////////////////////////////////////////////////////////

const globalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error:
      "Too many requests. Please slow down.",
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
  globalLimiter,
};