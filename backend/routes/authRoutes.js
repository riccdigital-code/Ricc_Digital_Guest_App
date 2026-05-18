//////////////////////////////////////////////////////////
// 🔐 AUTH ROUTES
//////////////////////////////////////////////////////////

const express = require("express");
const router = express.Router();

const {
  loginLimiter,
  registerLimiter,
} = require("../middleware/rateLimiter");

const {
  registerSchema,
  loginSchema,
} = require("../validators/authValidator");

const {
  registerUser,
  loginUser,
} = require("../services/authService");

const authenticate = require("../middleware/authMiddleware");
const prisma = require("../prismaClient");
const safeUser = require("../utils/safeUser");

//////////////////////////////////////////////////////////
// 🛡️ SHARED ERROR HANDLER
//////////////////////////////////////////////////////////

function handleAuthError(res, error, context) {
  console.error(`❌ ${context} error:`, error);

  //////////////////////////////////////////////////////////
  // ZOD VALIDATION ERRORS
  //////////////////////////////////////////////////////////

  if (error.name === "ZodError") {
    const issues = error.issues || error.errors || [];

    return res.status(400).json({
      error: "Validation failed",
      fields: issues.map((issue) => ({
        field: issue.path?.[0] || "unknown",
        message: issue.message || "Invalid input",
      })),
    });
  }

  //////////////////////////////////////////////////////////
  // KNOWN BUSINESS LOGIC ERRORS
  //////////////////////////////////////////////////////////

  const knownErrors = {
    "Email already exists": 409,
    "Invalid credentials": 401,
    "Account not found": 404,
  };

  if (knownErrors[error.message]) {
    return res.status(knownErrors[error.message]).json({
      error: error.message,
    });
  }

  //////////////////////////////////////////////////////////
  // UNKNOWN SERVER ERROR
  //////////////////////////////////////////////////////////

  return res.status(500).json({
    error: `${context} failed. Please try again.`,
  });
}

//////////////////////////////////////////////////////////
// 🧑‍💼 REGISTER USER
// POST /api/auth/register
//////////////////////////////////////////////////////////

router.post("/register", registerLimiter, async (req, res) => {
  try {

    //////////////////////////////////////////////////////////
    // VALIDATE INPUT
    //////////////////////////////////////////////////////////

    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return handleAuthError(res, result.error, "Register");
    }

    const validatedData = result.data;

    //////////////////////////////////////////////////////////
    // REGISTER USER
    //////////////////////////////////////////////////////////

    const user = await registerUser(validatedData);

    //////////////////////////////////////////////////////////
    // SUCCESS RESPONSE
    //////////////////////////////////////////////////////////

    res.status(201).json({
      message: "User created successfully",
      user: safeUser(user),
    });

  } catch (error) {
    handleAuthError(res, error, "Register");
  }
});

//////////////////////////////////////////////////////////
// 🔐 LOGIN USER
// POST /api/auth/login
//////////////////////////////////////////////////////////

router.post("/login", loginLimiter, async (req, res) => {
  try {

    //////////////////////////////////////////////////////////
    // VALIDATE INPUT
    //////////////////////////////////////////////////////////

    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return handleAuthError(res, result.error, "Login");
    }

    const validatedData = result.data;

    //////////////////////////////////////////////////////////
    // LOGIN USER
    //////////////////////////////////////////////////////////

    const loginResult = await loginUser(validatedData);

    //////////////////////////////////////////////////////////
    // SUCCESS RESPONSE
    //////////////////////////////////////////////////////////

    res.json({
      message: "Login successful",
      token: loginResult.token,
      user: loginResult.user,
    });

  } catch (error) {
    handleAuthError(res, error, "Login");
  }
});

//////////////////////////////////////////////////////////
// 👤 GET CURRENT AUTHENTICATED USER
// GET /api/auth/me
// Protected — requires valid JWT
//////////////////////////////////////////////////////////

router.get("/me", authenticate, async (req, res) => {
  try {

    //////////////////////////////////////////////////////////
    // FETCH FRESH USER FROM DATABASE
    // Never trust JWT payload alone — always verify against DB
    // Role or account status may have changed since token issued
    //////////////////////////////////////////////////////////

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    //////////////////////////////////////////////////////////
    // ACCOUNT DELETED AFTER TOKEN WAS ISSUED
    //////////////////////////////////////////////////////////

    if (!user) {
      return res.status(404).json({
        error: "Account no longer exists",
        code: "USER_NOT_FOUND",
      });
    }

    //////////////////////////////////////////////////////////
    // RETURN SAFE USER — password field stripped
    //////////////////////////////////////////////////////////

    res.status(200).json({
      user: safeUser(user),
    });

  } catch (error) {
    console.error("❌ /me error:", error);

    res.status(500).json({
      error: "Failed to fetch user",
      code: "ME_FAILED",
    });
  }
});

module.exports = router;