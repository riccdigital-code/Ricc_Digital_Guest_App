//////////////////////////////////////////////////////////
// 🍽️ SERVICE ITEM ROUTES
//////////////////////////////////////////////////////////

const express = require("express");
const router = express.Router();

const prisma = require("../prismaClient");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

//////////////////////////////////////////////////////////
// 🍽️ CREATE SERVICE ITEM — ADMIN ACTION
// POST /api/service-items
//////////////////////////////////////////////////////////

router.post("/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      //////////////////////////////////////////////////////////
      // STEP 1 — VALIDATE INPUT
      //////////////////////////////////////////////////////////

      const { categoryId, name, isPaid, price } = req.body;

      if (!name || typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({
          error: "Item name is required",
        });
      }

      if (name.trim().length > 150) {
        return res.status(400).json({
          error: "Item name must be 150 characters or less",
        });
      }

      if (!categoryId || typeof categoryId !== "number") {
        return res.status(400).json({
          error: "categoryId is required and must be a number",
        });
      }

      if (isPaid !== undefined && typeof isPaid !== "boolean") {
        return res.status(400).json({
          error: "isPaid must be a boolean",
        });
      }

      //////////////////////////////////////////////////////////
      // PAID ITEM MUST HAVE A VALID PRICE
      //////////////////////////////////////////////////////////

      if (isPaid === true) {
        if (price === undefined || price === null) {
          return res.status(400).json({
            error: "Price is required for paid items",
          });
        }

        if (typeof price !== "number" || price <= 0) {
          return res.status(400).json({
            error: "Price must be a positive number",
          });
        }
      }

      //////////////////////////////////////////////////////////
      // FREE ITEM SHOULD NOT HAVE A PRICE
      //////////////////////////////////////////////////////////

      if (isPaid === false && price !== undefined && price !== null) {
        return res.status(400).json({
          error: "Free items should not have a price. Set isPaid to true to add pricing.",
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 2 — PROPERTY FROM TOKEN
      //////////////////////////////////////////////////////////

      const propertyId = req.user.propertyId;

      //////////////////////////////////////////////////////////
      // STEP 3 — VERIFY CATEGORY EXISTS AND BELONGS TO PROPERTY
      // Cross-tenant category reference must be blocked
      //////////////////////////////////////////////////////////

      const category = await prisma.serviceCategory.findFirst({
        where: {
          id: categoryId,
          propertyId,
          isActive: true,
        },
      });

      if (!category) {
        return res.status(404).json({
          error: "Category not found, inactive, or does not belong to your property",
          code: "INVALID_CATEGORY",
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 4 — DUPLICATE NAME CHECK WITHIN CATEGORY
      //////////////////////////////////////////////////////////

      const existing = await prisma.serviceItem.findFirst({
        where: {
          propertyId,
          categoryId,
          name: name.trim(),
        },
      });

      if (existing) {
        return res.status(409).json({
          error: `An item named "${name.trim()}" already exists in this category`,
          code: "DUPLICATE_ITEM",
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 5 — CREATE SERVICE ITEM
      //////////////////////////////////////////////////////////

      const item = await prisma.serviceItem.create({
        data: {
          propertyId,
          categoryId,
          name: name.trim(),
          isPaid: isPaid ?? false,
          price: isPaid ? price : null,
          isActive: true,
        },
        include: {
          category: {
            select: { id: true, name: true, type: true },
          },
        },
      });

      console.log(
        `🍽️ Item created | Name: ${name} | Category: ${category.name} | Paid: ${isPaid ?? false} | Property: ${propertyId}`
      );

      res.status(201).json({
        message: "Service item created successfully",
        item,
      });

    } catch (error) {
      console.error("❌ Create item error:", error);
      res.status(500).json({ error: "Failed to create service item" });
    }
  }
);

//////////////////////////////////////////////////////////
// 📋 GET ALL ITEMS — ADMIN VIEW
// GET /api/service-items
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
      // OPTIONAL FILTERS
      //////////////////////////////////////////////////////////

      const { categoryId, isPaid, isActive } = req.query;

      const filters = {
        ...(propertyId && { propertyId }),
        ...(categoryId && { categoryId: Number(categoryId) }),
        ...(isPaid !== undefined && { isPaid: isPaid === "true" }),
        ...(isActive !== undefined && { isActive: isActive === "true" }),
      };

      const items = await prisma.serviceItem.findMany({
        where: filters,
        include: {
          category: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: [
          { category: { name: "asc" } },
          { name: "asc" },
        ],
      });

      res.json({ items });

    } catch (error) {
      console.error("❌ Fetch items error:", error);
      res.status(500).json({ error: "Failed to fetch service items" });
    }
  }
);

//////////////////////////////////////////////////////////
// 📋 GET ITEMS BY CATEGORY — GUEST VIEW
// GET /api/service-items/guest/:categoryId
// Guest browses items inside a specific category
//////////////////////////////////////////////////////////

router.get("/guest/:categoryId",
  authenticate,
  authorizeRoles("GUEST"),
  async (req, res) => {
    try {

      const categoryId = Number(req.params.categoryId);
      const propertyId = req.user.propertyId;

      //////////////////////////////////////////////////////////
      // VERIFY CATEGORY BELONGS TO GUEST PROPERTY
      //////////////////////////////////////////////////////////

      const category = await prisma.serviceCategory.findFirst({
        where: {
          id: categoryId,
          propertyId,
          isActive: true,
        },
      });

      if (!category) {
        return res.status(404).json({
          error: "Category not found or unavailable",
          code: "CATEGORY_NOT_FOUND",
        });
      }

      //////////////////////////////////////////////////////////
      // RETURN ACTIVE ITEMS ONLY
      // Guests never see disabled items
      //////////////////////////////////////////////////////////

      const items = await prisma.serviceItem.findMany({
        where: {
          categoryId,
          propertyId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          isPaid: true,
          price: true,
        },
        orderBy: { name: "asc" },
      });

      res.json({
        category: {
          id: category.id,
          name: category.name,
          type: category.type,
        },
        items,
      });

    } catch (error) {
      console.error("❌ Fetch guest items error:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  }
);

//////////////////////////////////////////////////////////
// 🔍 GET SINGLE ITEM — ADMIN
// GET /api/service-items/:id
//////////////////////////////////////////////////////////

router.get("/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const itemId = Number(req.params.id);

      const item = await prisma.serviceItem.findUnique({
        where: { id: itemId },
        include: {
          category: {
            select: { id: true, name: true, type: true },
          },
        },
      });

      if (!item) {
        return res.status(404).json({
          error: "Service item not found",
          code: "ITEM_NOT_FOUND",
        });
      }

      //////////////////////////////////////////////////////////
      // ADMIN — own property only
      //////////////////////////////////////////////////////////

      if (
        req.user.role === "ADMIN" &&
        item.propertyId !== req.user.propertyId
      ) {
        return res.status(403).json({
          error: "You can only view items from your property",
          code: "FORBIDDEN",
        });
      }

      res.json({ item });

    } catch (error) {
      console.error("❌ Fetch item error:", error);
      res.status(500).json({ error: "Failed to fetch service item" });
    }
  }
);

//////////////////////////////////////////////////////////
// ✏️ UPDATE SERVICE ITEM — ADMIN ACTION
// PATCH /api/service-items/:id
//////////////////////////////////////////////////////////

router.patch("/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const itemId = Number(req.params.id);

      //////////////////////////////////////////////////////////
      // VERIFY EXISTS + OWNERSHIP
      //////////////////////////////////////////////////////////

      const existing = await prisma.serviceItem.findUnique({
        where: { id: itemId },
      });

      if (!existing) {
        return res.status(404).json({
          error: "Service item not found",
          code: "ITEM_NOT_FOUND",
        });
      }

      if (
        req.user.role === "ADMIN" &&
        existing.propertyId !== req.user.propertyId
      ) {
        return res.status(403).json({
          error: "You can only update items from your property",
          code: "FORBIDDEN",
        });
      }

      //////////////////////////////////////////////////////////
      // BUILD UPDATE DATA
      //////////////////////////////////////////////////////////

      const { name, isPaid, price, isActive } = req.body;
      const updateData = {};

      if (name !== undefined) {
        if (typeof name !== "string" || name.trim() === "") {
          return res.status(400).json({
            error: "Name must be a non-empty string",
          });
        }
        updateData.name = name.trim();
      }

      if (isActive !== undefined) {
        if (typeof isActive !== "boolean") {
          return res.status(400).json({ error: "isActive must be a boolean" });
        }
        updateData.isActive = isActive;
      }

      if (isPaid !== undefined) {
        if (typeof isPaid !== "boolean") {
          return res.status(400).json({ error: "isPaid must be a boolean" });
        }
        updateData.isPaid = isPaid;

        //////////////////////////////////////////////////////////
        // SWITCHING TO PAID — price becomes required
        //////////////////////////////////////////////////////////

        if (isPaid === true) {
          const resolvedPrice = price ?? existing.price;

          if (!resolvedPrice || resolvedPrice <= 0) {
            return res.status(400).json({
              error: "A valid price is required when isPaid is true",
            });
          }
          updateData.price = resolvedPrice;
        }

        //////////////////////////////////////////////////////////
        // SWITCHING TO FREE — clear price
        //////////////////////////////////////////////////////////

        if (isPaid === false) {
          updateData.price = null;
        }
      }

      if (price !== undefined && updateData.isPaid !== false) {
        if (typeof price !== "number" || price <= 0) {
          return res.status(400).json({
            error: "Price must be a positive number",
          });
        }
        updateData.price = price;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: "No valid fields provided to update",
        });
      }

      const item = await prisma.serviceItem.update({
        where: { id: itemId },
        data: updateData,
        include: {
          category: {
            select: { id: true, name: true, type: true },
          },
        },
      });

      console.log(
        `✏️ Item updated | ID: ${itemId} | By: ${req.user.id}`
      );

      res.json({
        message: "Service item updated successfully",
        item,
      });

    } catch (error) {
      console.error("❌ Update item error:", error);
      res.status(500).json({ error: "Failed to update service item" });
    }
  }
);

//////////////////////////////////////////////////////////
// 🗑️ DELETE SERVICE ITEM — ADMIN ACTION
// DELETE /api/service-items/:id
// Blocked if item has been used in existing orders or requests
//////////////////////////////////////////////////////////

router.delete("/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const itemId = Number(req.params.id);

      //////////////////////////////////////////////////////////
      // VERIFY EXISTS + OWNERSHIP
      //////////////////////////////////////////////////////////

      const existing = await prisma.serviceItem.findUnique({
        where: { id: itemId },
        include: {
          _count: {
            select: {
              OrderItem: true,
              requests: true,
            },
          },
        },
      });

      if (!existing) {
        return res.status(404).json({
          error: "Service item not found",
          code: "ITEM_NOT_FOUND",
        });
      }

      if (
        req.user.role === "ADMIN" &&
        existing.propertyId !== req.user.propertyId
      ) {
        return res.status(403).json({
          error: "You can only delete items from your property",
          code: "FORBIDDEN",
        });
      }

      //////////////////////////////////////////////////////////
      // SAFETY CHECK — block if item has usage history
      // Deleting referenced items breaks order/request records
      // Recommend disable (isActive: false) instead
      //////////////////////////////////////////////////////////

      const usageCount =
        existing._count.OrderItem + existing._count.requests;

      if (usageCount > 0) {
        return res.status(409).json({
          error: `Cannot delete item with ${usageCount} existing order(s) or request(s). Disable it instead using PATCH with isActive: false.`,
          code: "ITEM_IN_USE",
          usageCount,
        });
      }

      await prisma.serviceItem.delete({
        where: { id: itemId },
      });

      console.log(
        `🗑️ Item deleted | ID: ${itemId} | By: ${req.user.id}`
      );

      res.json({
        message: "Service item deleted successfully",
      });

    } catch (error) {
      console.error("❌ Delete item error:", error);
      res.status(500).json({ error: "Failed to delete service item" });
    }
  }
);

module.exports = router;