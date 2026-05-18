//////////////////////////////////////////////////////////
// 🗂️ CATEGORY ROUTES
//////////////////////////////////////////////////////////

const express = require("express");
const router = express.Router();

const prisma = require("../prismaClient");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

//////////////////////////////////////////////////////////
// VALID CATEGORY TYPES
// "request" — housekeeping, maintenance, concierge
// "order"   — food, drinks, minibar
//////////////////////////////////////////////////////////

const VALID_TYPES = ["request", "order"];

//////////////////////////////////////////////////////////
// 🗂️ CREATE CATEGORY — ADMIN ACTION
// POST /api/categories
// Admin builds their property's service catalog
//////////////////////////////////////////////////////////

router.post("/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      //////////////////////////////////////////////////////////
      // STEP 1 — VALIDATE INPUT
      //////////////////////////////////////////////////////////

      const { name, type } = req.body;

      if (!name || typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({
          error: "Category name is required",
        });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({
          error: "Category name must be 100 characters or less",
        });
      }

      if (!type) {
        return res.status(400).json({
          error: "Category type is required",
          allowedTypes: VALID_TYPES,
        });
      }

      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({
          error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
          allowedTypes: VALID_TYPES,
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 2 — PROPERTY FROM TOKEN
      //////////////////////////////////////////////////////////

      const propertyId = req.user.propertyId;

      //////////////////////////////////////////////////////////
      // STEP 3 — DUPLICATE NAME CHECK WITHIN PROPERTY
      //////////////////////////////////////////////////////////

      const existing = await prisma.serviceCategory.findFirst({
        where: {
          propertyId,
          name: name.trim(),
          type,
        },
      });

      if (existing) {
        return res.status(409).json({
          error: `A "${type}" category named "${name.trim()}" already exists for this property`,
          code: "DUPLICATE_CATEGORY",
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 4 — CREATE CATEGORY
      //////////////////////////////////////////////////////////

      const category = await prisma.serviceCategory.create({
        data: {
          propertyId,
          name: name.trim(),
          type,
          isActive: true,
        },
      });

      console.log(
        `🗂️ Category created | Name: ${name} | Type: ${type} | Property: ${propertyId}`
      );

      res.status(201).json({
        message: "Category created successfully",
        category,
      });

    } catch (error) {
      console.error("❌ Create category error:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  }
);

//////////////////////////////////////////////////////////
// 📋 GET ALL CATEGORIES — ADMIN VIEW
// GET /api/categories
// Admin manages their full service catalog
//////////////////////////////////////////////////////////

router.get("/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      //////////////////////////////////////////////////////////
      // SCOPE BY ROLE
      //////////////////////////////////////////////////////////

      const propertyId =
        req.user.role === "ADMIN" ? req.user.propertyId : undefined;

      //////////////////////////////////////////////////////////
      // OPTIONAL FILTER BY TYPE
      //////////////////////////////////////////////////////////

      const { type } = req.query;

      if (type && !VALID_TYPES.includes(type)) {
        return res.status(400).json({
          error: "Invalid type filter",
          allowedTypes: VALID_TYPES,
        });
      }

      const categories = await prisma.serviceCategory.findMany({
        where: {
          ...(propertyId && { propertyId }),
          ...(type && { type }),
        },
        include: {
          items: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              isPaid: true,
              price: true,
              isActive: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { name: "asc" },
      });

      res.json({ categories });

    } catch (error) {
      console.error("❌ Fetch categories error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  }
);

//////////////////////////////////////////////////////////
// 📋 GET ACTIVE CATEGORIES — GUEST VIEW
// GET /api/categories/guest
// Guest browses available services for their property
// Returns only active categories with active items
//////////////////////////////////////////////////////////

router.get("/guest",
  authenticate,
  authorizeRoles("GUEST"),
  async (req, res) => {
    try {

      const propertyId = req.user.propertyId;

      const categories = await prisma.serviceCategory.findMany({
        where: {
          propertyId,
          isActive: true,
        },
        include: {
          items: {
            where: {
              propertyId,
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              isPaid: true,
              price: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      //////////////////////////////////////////////////////////
      // FILTER OUT CATEGORIES WITH NO ACTIVE ITEMS
      //////////////////////////////////////////////////////////

      const nonEmpty = categories.filter(
        (cat) => cat.items.length > 0
      );

      res.json({ categories: nonEmpty });

    } catch (error) {
      console.error("❌ Fetch guest categories error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  }
);

//////////////////////////////////////////////////////////
// 🔍 GET SINGLE CATEGORY — ADMIN
// GET /api/categories/:id
//////////////////////////////////////////////////////////

router.get("/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const categoryId = Number(req.params.id);

      const category = await prisma.serviceCategory.findUnique({
        where: { id: categoryId },
        include: {
          items: {
            select: {
              id: true,
              name: true,
              isPaid: true,
              price: true,
              isActive: true,
            },
          },
        },
      });

      if (!category) {
        return res.status(404).json({
          error: "Category not found",
          code: "CATEGORY_NOT_FOUND",
        });
      }

      //////////////////////////////////////////////////////////
      // ADMIN — own property only
      //////////////////////////////////////////////////////////

      if (
        req.user.role === "ADMIN" &&
        category.propertyId !== req.user.propertyId
      ) {
        return res.status(403).json({
          error: "You can only view categories from your property",
          code: "FORBIDDEN",
        });
      }

      res.json({ category });

    } catch (error) {
      console.error("❌ Fetch category error:", error);
      res.status(500).json({ error: "Failed to fetch category" });
    }
  }
);

//////////////////////////////////////////////////////////
// ✏️ UPDATE CATEGORY — ADMIN ACTION
// PATCH /api/categories/:id
//////////////////////////////////////////////////////////

router.patch("/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const categoryId = Number(req.params.id);
      const { name, isActive } = req.body;

      //////////////////////////////////////////////////////////
      // VERIFY CATEGORY EXISTS + OWNERSHIP
      //////////////////////////////////////////////////////////

      const existing = await prisma.serviceCategory.findUnique({
        where: { id: categoryId },
      });

      if (!existing) {
        return res.status(404).json({
          error: "Category not found",
          code: "CATEGORY_NOT_FOUND",
        });
      }

      if (
        req.user.role === "ADMIN" &&
        existing.propertyId !== req.user.propertyId
      ) {
        return res.status(403).json({
          error: "You can only update categories from your property",
          code: "FORBIDDEN",
        });
      }

      //////////////////////////////////////////////////////////
      // BUILD UPDATE DATA — only update provided fields
      //////////////////////////////////////////////////////////

      const updateData = {};

      if (name !== undefined) {
        if (typeof name !== "string" || name.trim() === "") {
          return res.status(400).json({
            error: "Category name must be a non-empty string",
          });
        }
        updateData.name = name.trim();
      }

      if (isActive !== undefined) {
        if (typeof isActive !== "boolean") {
          return res.status(400).json({
            error: "isActive must be a boolean",
          });
        }
        updateData.isActive = isActive;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: "No valid fields provided to update",
        });
      }

      const category = await prisma.serviceCategory.update({
        where: { id: categoryId },
        data: updateData,
      });

      console.log(
        `✏️ Category updated | ID: ${categoryId} | By: ${req.user.id}`
      );

      res.json({
        message: "Category updated successfully",
        category,
      });

    } catch (error) {
      console.error("❌ Update category error:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  }
);

//////////////////////////////////////////////////////////
// 🗑️ DELETE CATEGORY — ADMIN ACTION
// DELETE /api/categories/:id
// Only allowed if category has no active items
//////////////////////////////////////////////////////////

router.delete("/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const categoryId = Number(req.params.id);

      //////////////////////////////////////////////////////////
      // VERIFY EXISTS + OWNERSHIP
      //////////////////////////////////////////////////////////

      const existing = await prisma.serviceCategory.findUnique({
        where: { id: categoryId },
        include: {
          _count: { select: { items: true } },
        },
      });

      if (!existing) {
        return res.status(404).json({
          error: "Category not found",
          code: "CATEGORY_NOT_FOUND",
        });
      }

      if (
        req.user.role === "ADMIN" &&
        existing.propertyId !== req.user.propertyId
      ) {
        return res.status(403).json({
          error: "You can only delete categories from your property",
          code: "FORBIDDEN",
        });
      }

      //////////////////////////////////////////////////////////
      // SAFETY CHECK — block delete if items exist
      // Deleting a category with items orphans service items
      // Admin must remove or reassign items first
      //////////////////////////////////////////////////////////

      if (existing._count.items > 0) {
        return res.status(409).json({
          error: `Cannot delete category with ${existing._count.items} existing service item(s). Remove or reassign items first.`,
          code: "CATEGORY_HAS_ITEMS",
          itemCount: existing._count.items,
        });
      }

      await prisma.serviceCategory.delete({
        where: { id: categoryId },
      });

      console.log(
        `🗑️ Category deleted | ID: ${categoryId} | By: ${req.user.id}`
      );

      res.json({
        message: "Category deleted successfully",
      });

    } catch (error) {
      console.error("❌ Delete category error:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  }
);

module.exports = router;