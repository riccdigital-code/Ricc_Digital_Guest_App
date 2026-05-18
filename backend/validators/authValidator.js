//////////////////////////////////////////////////////////
// 🔐 AUTH VALIDATOR
// Zod v3 — aligned to authService and User model
//
// FIELD DECISIONS:
//   name — single field, matches User.name in schema
//          firstName/lastName split deferred to
//          Phase 2 when vendor/rider identity needed
//
// ROLE RESTRICTION:
//   SUPER_ADMIN — seed only, never via register endpoint
//   GUEST       — booking flow only, never via register
//   ADMIN/STAFF — only roles allowed via register
//////////////////////////////////////////////////////////

const { z } = require("zod");
const {
  emailSchema,
  passwordSchema,
  propertyIdSchema,
  stringField,
} = require("./sharedSchemas");

//////////////////////////////////////////////////////////
// REGISTER SCHEMA
//////////////////////////////////////////////////////////

const registerSchema = z.object({

  //////////////////////////////////////////////////////////
  // name — single field matching User model
  // authService expects: data.name
  //////////////////////////////////////////////////////////

  name: stringField("Name", 100),

  email: emailSchema,

  password: passwordSchema,

  //////////////////////////////////////////////////////////
  // ROLE RESTRICTED — ADMIN and STAFF only
  //////////////////////////////////////////////////////////

  role: z.enum(["ADMIN", "STAFF"], {
    required_error:    "Role is required",
    invalid_type_error: "Role must be ADMIN or STAFF",
  }),

  //////////////////////////////////////////////////////////
  // propertyId optional in validator
  // Route uses req.user.propertyId for ADMIN
  // SUPER_ADMIN can assign to any property via this field
  //////////////////////////////////////////////////////////

  propertyId: propertyIdSchema.optional(),
});

//////////////////////////////////////////////////////////
// LOGIN SCHEMA
//////////////////////////////////////////////////////////

const loginSchema = z.object({

  email: emailSchema,

  password: z
    .string({
      required_error:    "Password is required",
      invalid_type_error: "Password must be a string",
    })
    .min(1, "Password is required"),
});

//////////////////////////////////////////////////////////
// REFRESH TOKEN SCHEMA
// Phase 2 — ready when refresh tokens implemented
//////////////////////////////////////////////////////////

const refreshTokenSchema = z.object({

  refreshToken: z
    .string({
      required_error:    "Refresh token is required",
      invalid_type_error: "Refresh token must be a string",
    })
    .min(1, "Refresh token cannot be empty"),
});

//////////////////////////////////////////////////////////
// FORGOT PASSWORD SCHEMA
// Phase 2 — ready when password recovery implemented
//////////////////////////////////////////////////////////

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

//////////////////////////////////////////////////////////
// RESET PASSWORD SCHEMA
// Phase 2 — ready when password recovery implemented
//////////////////////////////////////////////////////////

const resetPasswordSchema = z.object({

  token: z
    .string({
      required_error:    "Reset token is required",
      invalid_type_error: "Reset token must be a string",
    })
    .min(1, "Reset token cannot be empty"),

  password: passwordSchema,
});

//////////////////////////////////////////////////////////
// EXPORTS
//////////////////////////////////////////////////////////

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};