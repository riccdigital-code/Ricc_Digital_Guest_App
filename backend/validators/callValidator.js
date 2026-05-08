const { z } = require("zod");

const createCallSchema = z.object({
  roomNumber: z.string().min(1),
  urgency: z.enum(["low", "normal", "high"]).optional(),
  phone: z.string().optional(),
});

module.exports = {
  createCallSchema,
};