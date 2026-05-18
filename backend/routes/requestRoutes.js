//////////////////////////////////////////////////////////
// 🧹 REQUEST ROUTES
// Guest service requests + admin management
//
// ROUTES:
//   POST   /              — create request (GUEST)
//   GET    /              — list requests (ADMIN/SUPER_ADMIN)
//   GET    /services      — service catalog (GUEST)
//   GET    /my-requests   — assigned requests (STAFF)
//   GET    /:id           — single request (ADMIN/SUPER_ADMIN)
//   PATCH  /:id/status    — update status (ADMIN/SUPER_ADMIN)
//////////////////////////////////////////////////////////

const express = require("express");
const router  = express.Router();

const prisma         = require("../prismaClient");
const authenticate   = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { getPropertyFilter, canAccessProperty, forbiddenResponse } =
  require("../utils/scopeByRole");

const { routeTask }          = require("../services/taskRoutingService");
const { notifyNewRequest }   = require("../services/socketService");

const { TASK_STATUSES }  = require("../constants/taskStatuses");
const { PRIORITIES }     = require("../constants/priorities");

const REQUEST_STATUSES = Object.values(TASK_STATUSES);

//////////////////////////////////////////////////////////
// POST / — CREATE SERVICE REQUEST
// GUEST only — atomic: ServiceRequest + Task
//////////////////////////////////////////////////////////

router.post("/",
  authenticate,
  authorizeRoles("GUEST"),
  async (req, res) => {
    try {

      //////////////////////////////////////////////////////////
      // STEP 1 — VALIDATE INPUT
      //////////////////////////////////////////////////////////

      const { serviceItemId, roomNumber, note } = req.body;

      if (!roomNumber || typeof roomNumber !== "string" || !roomNumber.trim()) {
        return res.status(400).json({
          error: "roomNumber is required",
          code:  "MISSING_ROOM_NUMBER",
        });
      }

      if (!serviceItemId || typeof serviceItemId !== "number") {
        return res.status(400).json({
          error: "serviceItemId is required and must be a number",
          code:  "INVALID_SERVICE_ITEM_ID",
        });
      }

      if (note && typeof note !== "string") {
        return res.status(400).json({ error: "note must be a string" });
      }

      if (note && note.length > 500) {
        return res.status(400).json({
          error: "note must be 500 characters or less",
          code:  "NOTE_TOO_LONG",
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 2 — PROPERTY FROM TOKEN
      //////////////////////////////////////////////////////////

      const propertyId = req.user.propertyId;

      //////////////////////////////////////////////////////////
      // STEP 3 — VALIDATE SERVICE ITEM
      // Must exist, be active, belong to this property
      //////////////////////////////////////////////////////////

      const serviceItem = await prisma.serviceItem.findFirst({
        where: {
          id:         serviceItemId,
          propertyId,
          isActive:   true,
        },
        include: { category: true },
      });

      if (!serviceItem) {
        return res.status(400).json({
          error: "Service not found, unavailable, or does not belong to this property",
          code:  "INVALID_SERVICE",
        });
      }

      //////////////////////////////////////////////////////////
      // STEP 4 — ROUTE TASK TO STAFF
      // Uses shared routing service
      //////////////////////////////////////////////////////////

      const { selectedStaff } = await routeTask(
        propertyId,
        PRIORITIES.NORMAL,
        "request"
      );

      //////////////////////////////////////////////////////////
      // STEP 5 — ATOMIC TRANSACTION
      //////////////////////////////////////////////////////////

      const result = await prisma.$transaction(async (tx) => {

        const request = await tx.serviceRequest.create({
          data: {
            propertyId,
            roomNumber:    roomNumber.trim(),
            serviceItemId,
            note:          note ? note.trim() : null,
            status:        TASK_STATUSES.PENDING,
          },
        });

        const task = await tx.task.create({
          data: {
            propertyId,
            itemName:     `Request: ${serviceItem.name}`,
            status:       TASK_STATUSES.PENDING,
            priority:     PRIORITIES.NORMAL,
            assignedToId: selectedStaff?.id || null,
            requestId:    request.id,
          },
        });

        return { request, task };
      });

      //////////////////////////////////////////////////////////
      // STEP 6 — EMIT REALTIME via socketService
      //////////////////////////////////////////////////////////

      const io = req.app.get("io");
      notifyNewRequest(io, result.request, result.task);

      console.log(
        `🧹 Request | Service: ${serviceItem.name} | Room: ${roomNumber} | Property: ${propertyId} | Assigned: ${selectedStaff?.name || "UNASSIGNED"}`
      );

      res.status(201).json({
        message:  "Request created successfully",
        request:  result.request,
        task:     result.task,
        service: {
          name:     serviceItem.name,
          category: serviceItem.category.name,
          isPaid:   serviceItem.isPaid,
          price:    serviceItem.isPaid ? serviceItem.price : null,
        },
        assigned: selectedStaff
          ? { staffId: selectedStaff.id, staffName: selectedStaff.name }
          : { staffId: null, warning: "No staff available. Request is unassigned." },
      });

    } catch (error) {
      console.error("❌ Create request error:", error);
      res.status(500).json({ error: "Failed to create request" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET /services — SERVICE CATALOG
// GUEST browses available services for their property
// Must be registered BEFORE GET /:id
//////////////////////////////////////////////////////////

router.get("/services",
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
              isActive:   true,
              propertyId,
            },
            select: {
              id:     true,
              name:   true,
              isPaid: true,
              price:  true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      const nonEmpty = categories.filter((cat) => cat.items.length > 0);

      res.json({ categories: nonEmpty });

    } catch (error) {
      console.error("❌ Fetch services error:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET /my-requests — STAFF ASSIGNED REQUESTS
// Must be registered BEFORE GET /:id
//////////////////////////////////////////////////////////

router.get("/my-requests",
  authenticate,
  authorizeRoles("STAFF"),
  async (req, res) => {
    try {

      const where = {
        assignedToId: req.user.id,
        requestId:    { not: null },
      };

      if (req.query.status) {
        const status = req.query.status.toLowerCase();
        if (!REQUEST_STATUSES.includes(status)) {
          return res.status(400).json({
            error:         "Invalid status filter",
            code:          "INVALID_STATUS",
            allowedValues: REQUEST_STATUSES,
          });
        }
        where.status = status;
      }

      const tasks = await prisma.task.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          request: {
            include: {
              serviceItem: {
                include: { category: true },
              },
            },
          },
        },
      });

      res.json({ tasks, total: tasks.length });

    } catch (error) {
      console.error("❌ Fetch my requests error:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET / — LIST ALL REQUESTS
//////////////////////////////////////////////////////////

router.get("/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const propertyFilter = getPropertyFilter(req.user);
      const filters        = { ...propertyFilter };

      if (req.query.status) {
        const status = req.query.status.toLowerCase();
        if (!REQUEST_STATUSES.includes(status)) {
          return res.status(400).json({
            error:         "Invalid status filter",
            code:          "INVALID_STATUS",
            allowedValues: REQUEST_STATUSES,
          });
        }
        filters.status = status;
      }

      const requests = await prisma.serviceRequest.findMany({
        where:   filters,
        orderBy: { createdAt: "desc" },
        include: {
          serviceItem: { include: { category: true } },
          tasks:       true,
        },
      });

      res.json({ requests, total: requests.length });

    } catch (error) {
      console.error("❌ List requests error:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  }
);

//////////////////////////////////////////////////////////
// GET /:id — SINGLE REQUEST
//////////////////////////////////////////////////////////

router.get("/:id",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const requestId = Number(req.params.id);

      if (!Number.isFinite(requestId) || requestId <= 0) {
        return res.status(400).json({ error: "Invalid request ID", code: "INVALID_ID" });
      }

      const request = await prisma.serviceRequest.findUnique({
        where:   { id: requestId },
        include: {
          serviceItem: { include: { category: true } },
          tasks:       true,
        },
      });

      if (!request) {
        return res.status(404).json({ error: "Request not found", code: "NOT_FOUND" });
      }

      if (!canAccessProperty(req.user, request.propertyId)) {
        return forbiddenResponse(res, "You can only view requests in your property");
      }

      res.json({ request });

    } catch (error) {
      console.error("❌ Fetch request error:", error);
      res.status(500).json({ error: "Failed to fetch request" });
    }
  }
);

//////////////////////////////////////////////////////////
// PATCH /:id/status — UPDATE REQUEST STATUS
//////////////////////////////////////////////////////////

router.patch("/:id/status",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {

      const requestId = Number(req.params.id);
      const { status } = req.body;

      if (!Number.isFinite(requestId) || requestId <= 0) {
        return res.status(400).json({ error: "Invalid request ID", code: "INVALID_ID" });
      }

      if (!status || !REQUEST_STATUSES.includes(status.toLowerCase())) {
        return res.status(400).json({
          error:         "Invalid or missing status",
          code:          "INVALID_STATUS",
          allowedValues: REQUEST_STATUSES,
        });
      }

      const request = await prisma.serviceRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        return res.status(404).json({ error: "Request not found", code: "NOT_FOUND" });
      }

      if (!canAccessProperty(req.user, request.propertyId)) {
        return forbiddenResponse(res, "You can only update requests in your property");
      }

      const updatedRequest = await prisma.serviceRequest.update({
        where: { id: requestId },
        data:  { status: status.toLowerCase() },
      });

      console.log(
        `🧹 Request ${requestId} | ${request.status} → ${status.toLowerCase()} | Admin: ${req.user.id}`
      );

      res.json({ message: "Request status updated", request: updatedRequest });

    } catch (error) {
      console.error("❌ Update request status error:", error);
      res.status(500).json({ error: "Failed to update request status" });
    }
  }
);

module.exports = router;