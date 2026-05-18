//////////////////////////////////////////////////////////
// 🛒 ORDER ROUTES
// Guest orders + admin management
//
// ROUTES:
//   POST   /           — create order (GUEST)
//   GET    /           — list orders (ADMIN/SUPER_ADMIN)
//   GET    /:id        — single order (ADMIN/SUPER_ADMIN)
//   PATCH  /:id/status — update status (ADMIN/SUPER_ADMIN)
//   PATCH  /:id/cancel — cancel order (ADMIN/SUPER_ADMIN)
//////////////////////////////////////////////////////////

const express = require("express");
const router  = express.Router();

const prisma          = require("../prismaClient");
const authenticate    = require("../middleware/authMiddleware");
const authorizeRoles  = require("../middleware/roleMiddleware");
const { getPropertyFilter, canAccessProperty, forbiddenResponse } =
  require("../utils/scopeByRole");

const { routeTask }        = require("../services/taskRoutingService");
const { notifyNewOrder }   = require("../services/socketService");

const { TASK_STATUSES }    = require("../constants/taskStatuses");
const { PRIORITIES }       = require("../constants/priorities");

//////////////////////////////////////////////////////////
// ORDER STATUS VALUES — lowercase throughout
//////////////////////////////////////////////////////////

const ORDER_STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"];

//////////////////////////////////////////////////////////
// POST / — CREATE ORDER
// GUEST only — atomic: Order → OrderItems → Tasks
//////////////////////////////////////////////////////////

router.post("/",
  authenticate,
  authorizeRoles("GUEST"),
  async (req, res) => {
    try {

      //////////////////////////////////////////////////////////
      // STEP 1 — VALIDATE INPUT
      //////////////////////////////////////////////////////////

      const { roomNumber, items } = req.body;

      if (!roomNumber || typeof roomNumber !== "string" || !roomNumber.trim()) {
        return res.status(400).json({
          error: "roomNumber is required",
          code:  "MISSING_ROOM_NUMBER",
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: "items must be a non-empty array",
          code:  "INVALID_ITEMS",
        });
      }

      for (const [index, item] of items.entries()) {
        if (!item.serviceItemId || typeof item.serviceItemId !== "number") {
          return res.status(400).json({
            error: `Item at index ${index}: serviceItemId must be a number`,
            code:  "INVALID_SERVICE_ITEM_ID",
          });
        }
        if (!item.quantity || typeof item.quantity !== "number" || item.quantity < 1) {
          return res.status(400).json({
            error: `Item at index ${index}: quantity must be 1 or more`,
            code:  "INVALID_QUANTITY",
          });
        }
      }

      //////////////////////////////////////////////////////////
      // STEP 2 — PROPERTY FROM TOKEN
      //////////////////////////////////////////////////////////

      const propertyId = req.user.propertyId;

      //////////////////////////////////////////////////////////
      // STEP 3 — VERIFY ALL SERVICE ITEMS UPFRONT
      // Fail fast before any writes
      //////////////////////////////////////////////////////////

      const serviceItemIds = items.map((i) => i.serviceItemId);

      const serviceItems = await prisma.serviceItem.findMany({
        where: {
          id:         { in: serviceItemIds },
          propertyId,
          isActive:   true,
        },
      });

      if (serviceItems.length !== serviceItemIds.length) {
        const foundIds   = serviceItems.map((si) => si.id);
        const missingIds = serviceItemIds.filter((id) => !foundIds.includes(id));

        return res.status(400).json({
          error:      "One or more service items not found or unavailable",
          code:       "MISSING_SERVICE_ITEMS",
          missingIds,
        });
      }

      const serviceItemMap = Object.fromEntries(
        serviceItems.map((si) => [si.id, si])
      );

      //////////////////////////////////////////////////////////
      // STEP 4 — ROUTE TASK TO STAFF
      // Uses shared routing service — no duplicated logic
      //////////////////////////////////////////////////////////

      const { selectedStaff } = await routeTask(propertyId, PRIORITIES.NORMAL, "order");

      //////////////////////////////////////////////////////////
      // STEP 5 — ATOMIC TRANSACTION
      // Order → OrderItems → Tasks — all or nothing
      //////////////////////////////////////////////////////////

      const result = await prisma.$transaction(async (tx) => {

        const order = await tx.order.create({
          data: {
            propertyId,
            roomNumber: roomNumber.trim(),
            status:     "pending",
          },
        });

        const createdTasks = [];

        for (const item of items) {
          const serviceItem = serviceItemMap[item.serviceItemId];

          const orderItem = await tx.orderItem.create({
            data: {
              orderId:       order.id,
              serviceItemId: item.serviceItemId,
              quantity:      item.quantity,
              status:        "pending",
            },
          });

          const task = await tx.task.create({
            data: {
              propertyId,
              itemName:     `Order: ${serviceItem.name} × ${item.quantity}`,
              status:       TASK_STATUSES.PENDING,
              priority:     PRIORITIES.NORMAL,
              assignedToId: selectedStaff?.id || null,
              orderItemId:  orderItem.id,
            },
          });

          createdTasks.push(task);
        }

        return { order, tasks: createdTasks };
      });

      //////////////////////////////////////////////////////////
      // STEP 6 — EMIT REALTIME via socketService
      //////////////////////////////////////////////////////////

      const io = req.app.get("io");
      notifyNewOrder(io, result.order, result.tasks);

      console.log(
        `🛒 Order ${result.order.id} | Items: ${items.length} | Property: ${propertyId} | Assigned: ${selectedStaff?.name || "UNASSIGNED"}`
      );

      res.status(201).json({
        message:  "Order created successfully",
        order:    result.order,
        tasks:    result.tasks,
        assigned: selectedStaff
          ? { staffId: selectedStaff.id, staffName: selectedStaff.name }
          : { staffId: null, warning: "No staff available. Tasks are unassigned." },
      });

    } catch (error) {
      console.error("❌ Create order error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET / — LIST ORDERS
//////////////////////////////////////////////////////////

router.get("/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const propertyFilter = getPropertyFilter(req.user);
      const filters        = { ...propertyFilter };

      if (req.query.status) {
        if (!ORDER_STATUSES.includes(req.query.status.toLowerCase())) {
          return res.status(400).json({
            error:          "Invalid status filter",
            code:           "INVALID_STATUS",
            allowedValues:  ORDER_STATUSES,
          });
        }
        filters.status = req.query.status.toLowerCase();
      }

      const orders = await prisma.order.findMany({
        where:   filters,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { serviceItem: true },
          },
        },
      });

      res.json({ orders, total: orders.length });

    } catch (error) {
      console.error("❌ List orders error:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET /:id — SINGLE ORDER
//////////////////////////////////////////////////////////

router.get("/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const orderId = Number(req.params.id);

      if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Invalid order ID", code: "INVALID_ID" });
      }

      const order = await prisma.order.findUnique({
        where:   { id: orderId },
        include: {
          items: { include: { serviceItem: true } },
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found", code: "NOT_FOUND" });
      }

      if (!canAccessProperty(req.user, order.propertyId)) {
        return forbiddenResponse(res, "You can only view orders in your property");
      }

      res.json({ order });

    } catch (error) {
      console.error("❌ Fetch order error:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  }
);

//////////////////////////////////////////////////////////
// PATCH /:id/status — UPDATE ORDER STATUS
//////////////////////////////////////////////////////////

router.patch("/:id/status",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const orderId = Number(req.params.id);
      const { status } = req.body;

      if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Invalid order ID", code: "INVALID_ID" });
      }

      if (!status || !ORDER_STATUSES.includes(status.toLowerCase())) {
        return res.status(400).json({
          error:         "Invalid or missing status",
          code:          "INVALID_STATUS",
          allowedValues: ORDER_STATUSES,
        });
      }

      const order = await prisma.order.findUnique({ where: { id: orderId } });

      if (!order) {
        return res.status(404).json({ error: "Order not found", code: "NOT_FOUND" });
      }

      if (!canAccessProperty(req.user, order.propertyId)) {
        return forbiddenResponse(res, "You can only update orders in your property");
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data:  { status: status.toLowerCase() },
      });

      console.log(
        `🛒 Order ${orderId} | ${order.status} → ${status.toLowerCase()} | Admin: ${req.user.id}`
      );

      res.json({ message: "Order status updated", order: updatedOrder });

    } catch (error) {
      console.error("❌ Update order status error:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  }
);

//////////////////////////////////////////////////////////
// PATCH /:id/cancel — CANCEL ORDER + ALL TASKS
// Atomic — order and tasks cancelled together
//////////////////////////////////////////////////////////

router.patch("/:id/cancel",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const orderId = Number(req.params.id);

      if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Invalid order ID", code: "INVALID_ID" });
      }

      const order = await prisma.order.findUnique({ where: { id: orderId } });

      if (!order) {
        return res.status(404).json({ error: "Order not found", code: "NOT_FOUND" });
      }

      if (!canAccessProperty(req.user, order.propertyId)) {
        return forbiddenResponse(res, "You can only cancel orders in your property");
      }

      if (order.status === "cancelled") {
        return res.status(400).json({
          error: "Order is already cancelled",
          code:  "ALREADY_CANCELLED",
        });
      }

      const result = await prisma.$transaction(async (tx) => {

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data:  { status: TASK_STATUSES.CANCELLED },
        });

        const orderItems = await tx.orderItem.findMany({
          where: { orderId },
        });

        const orderItemIds = orderItems.map((oi) => oi.id);

        const cancelled = await tx.task.updateMany({
          where: { orderItemId: { in: orderItemIds } },
          data:  { status: TASK_STATUSES.CANCELLED },
        });

        return { updatedOrder, cancelledTaskCount: cancelled.count };
      });

      const io = req.app.get("io");
      if (io) {
        const { emitToProperty, EVENTS } = require("../services/socketService");
        emitToProperty(io, order.propertyId, EVENTS.ORDER_UPDATED, {
          message: "Order cancelled",
          orderId,
        });
      }

      console.log(
        `🛒 Order ${orderId} cancelled | Tasks: ${result.cancelledTaskCount} | Admin: ${req.user.id}`
      );

      res.json({
        message:            "Order cancelled successfully",
        order:              result.updatedOrder,
        tasksAffected:      result.cancelledTaskCount,
      });

    } catch (error) {
      console.error("❌ Cancel order error:", error);
      res.status(500).json({ error: "Failed to cancel order" });
    }
  }
);

module.exports = router;