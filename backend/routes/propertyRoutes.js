//////////////////////////////////////////////////////////
// 🏢 PROPERTY ROUTES
//////////////////////////////////////////////////////////

const express = require("express");
const router = express.Router();

const prisma = require("../prismaClient");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

//////////////////////////////////////////////////////////
// 🏢 CREATE PROPERTY — SUPER_ADMIN ONLY
// POST /api/properties
// Onboards a new hotel/property onto the platform
// ownerId = the ADMIN user who will manage this property
//////////////////////////////////////////////////////////

router.post("/",
  authenticate,
  authorizeRoles("SUPER_ADMIN"),
  async (req, res) => {
    try {

      //////////////////////////////////////////////////////////
      // STEP 1 — VALIDATE INPUT
      //////////////////////////////////////////////////////////

      const { name, ownerId } = req.body;

      if (!name || typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({
          error: "Property name is required",
        });
      }

      if (!ownerId || typeof ownerId !== "number") {
        return res.status(400).json({
          error: "ownerId is required and must be a number",
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 2 — VERIFY OWNER EXISTS AND IS ADMIN ROLE
      // Properties must be owned by an ADMIN user
      // Prevents assigning to GUEST or STAFF accounts
      //////////////////////////////////////////////////////////

      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
      });

      if (!owner) {
        return res.status(404).json({
          error: "Owner user not found",
          code: "OWNER_NOT_FOUND",
        });
      }

      if (owner.role !== "ADMIN") {
        return res.status(400).json({
          error: "Property owner must be a user with ADMIN role",
          code: "INVALID_OWNER_ROLE",
          currentRole: owner.role,
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 3 — CHECK FOR DUPLICATE PROPERTY NAME UNDER OWNER
      //////////////////////////////////////////////////////////

      const existing = await prisma.property.findFirst({
        where: {
          name: name.trim(),
          ownerId,
        },
      });

      if (existing) {
        return res.status(409).json({
          error: `A property named "${name.trim()}" already exists for this owner`,
          code: "DUPLICATE_PROPERTY",
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 4 — CREATE PROPERTY
      //////////////////////////////////////////////////////////

      const property = await prisma.property.create({
        data: {
          name: name.trim(),
          ownerId,
        },
      });

      //////////////////////////////////////////////////////////
      // STEP 5 — LINK OWNER TO THIS PROPERTY
      // Admin user gets assigned to the property they own
      //////////////////////////////////////////////////////////

      await prisma.user.update({
        where: { id: ownerId },
        data: { propertyId: property.id },
      });

      console.log(
        `🏢 Property created | Name: ${name} | Owner: ${ownerId} | ID: ${property.id}`
      );

      res.status(201).json({
        message: "Property created successfully",
        property,
      });

    } catch (error) {
      console.error("❌ Create property error:", error);
      res.status(500).json({ error: "Failed to create property" });
    }
  }
);

//////////////////////////////////////////////////////////
// 📋 GET ALL PROPERTIES — SUPER_ADMIN ONLY
// GET /api/properties
// Platform-level view of all onboarded hotels
//////////////////////////////////////////////////////////

router.get("/",
  authenticate,
  authorizeRoles("SUPER_ADMIN"),
  async (req, res) => {
    try {

      const properties = await prisma.property.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              users: true,
              rooms: true,
              tasks: true,
              bookings: true,
            },
          },
        },
      });

      res.json({ properties, total: properties.length });

    } catch (error) {
      console.error("❌ Fetch properties error:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  }
);

//////////////////////////////////////////////////////////
// 🔍 GET SINGLE PROPERTY — ADMIN OR SUPER_ADMIN
// GET /api/properties/:id
// Admin views their own property details + operational stats
//////////////////////////////////////////////////////////

router.get("/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const propertyId = Number(req.params.id);

      //////////////////////////////////////////////////////////
      // ADMIN — can only view their own property
      // SUPER_ADMIN — can view any property
      //////////////////////////////////////////////////////////

      if (req.user.role === "ADMIN" && req.user.propertyId !== propertyId) {
        return res.status(403).json({
          error: "You can only view your own property",
          code: "FORBIDDEN",
        });
      }

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          rooms: {
            select: {
              id: true,
              roomNumber: true,
              floor: true,
              roomType: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              users: true,
              rooms: true,
              tasks: true,
              bookings: true,
              serviceItems: true,
            },
          },
        },
      });

      if (!property) {
        return res.status(404).json({
          error: "Property not found",
          code: "PROPERTY_NOT_FOUND",
        });
      }

      res.json({ property });

    } catch (error) {
      console.error("❌ Fetch property error:", error);
      res.status(500).json({ error: "Failed to fetch property" });
    }
  }
);

//////////////////////////////////////////////////////////
// ✏️ UPDATE PROPERTY — ADMIN OR SUPER_ADMIN
// PATCH /api/properties/:id
//////////////////////////////////////////////////////////

router.patch("/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const propertyId = Number(req.params.id);
      const { name } = req.body;

      //////////////////////////////////////////////////////////
      // ADMIN — can only update their own property
      //////////////////////////////////////////////////////////

      if (req.user.role === "ADMIN" && req.user.propertyId !== propertyId) {
        return res.status(403).json({
          error: "You can only update your own property",
          code: "FORBIDDEN",
        });
      }

      if (!name || name.trim() === "") {
        return res.status(400).json({
          error: "Property name is required",
        });
      }

      const property = await prisma.property.update({
        where: { id: propertyId },
        data: { name: name.trim() },
      });

      res.json({
        message: "Property updated",
        property,
      });

    } catch (error) {
      console.error("❌ Update property error:", error);
      res.status(500).json({ error: "Failed to update property" });
    }
  }
);

//////////////////////////////////////////////////////////
// 👥 GET PROPERTY STAFF — ADMIN OR SUPER_ADMIN
// GET /api/properties/:id/staff
// Returns all STAFF users belonging to this property
//////////////////////////////////////////////////////////

router.get("/:id/staff",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const propertyId = Number(req.params.id);

      //////////////////////////////////////////////////////////
      // ADMIN — can only view their own property staff
      //////////////////////////////////////////////////////////

      if (req.user.role === "ADMIN" && req.user.propertyId !== propertyId) {
        return res.status(403).json({
          error: "You can only view staff from your own property",
          code: "FORBIDDEN",
        });
      }

      const staff = await prisma.user.findMany({
        where: {
          propertyId,
          role: "STAFF",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: { name: "asc" },
      });

      res.json({ staff, total: staff.length });

    } catch (error) {
      console.error("❌ Fetch staff error:", error);
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  }
);

module.exports = router;