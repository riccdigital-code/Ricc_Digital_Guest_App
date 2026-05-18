//////////////////////////////////////////////////////////
// 📡 SOCKET SERVICE
// Centralised realtime event layer
// Single source of truth for all Socket.IO emissions
//
// ARCHITECTURE:
//   All backend events emit through this service.
//   Routes never call io.emit() directly.
//   Event names are constants — never magic strings.
//   All emissions are property-scoped by default.
//   Graceful degradation if io is unavailable.
//
// ROOM STRUCTURE:
//   property:{propertyId}  — all staff + admin for a property
//   user:{userId}          — direct notification to one user
//   admin:{propertyId}     — admin-only events
//////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////
// EVENT NAME REGISTRY
//
// Every event name used across the platform lives here.
// Routes and frontend both import from this registry.
// Prevents typos. Makes refactoring safe.
// One rename here → consistent everywhere.
//////////////////////////////////////////////////////////

const EVENTS = {

  //////////////////////////////////////////////////////////
  // TASK EVENTS
  //////////////////////////////////////////////////////////

  NEW_TASK:          "task:new",
  TASK_UPDATED:      "task:updated",
  TASK_REASSIGNED:   "task:reassigned",
  TASK_COMPLETED:    "task:completed",

  //////////////////////////////////////////////////////////
  // CALL EVENTS
  //////////////////////////////////////////////////////////

  CALL_CREATED:      "call:created",
  CALL_RESOLVED:     "call:resolved",

  //////////////////////////////////////////////////////////
  // ORDER EVENTS
  //////////////////////////////////////////////////////////

  ORDER_CREATED:     "order:created",
  ORDER_UPDATED:     "order:updated",

  //////////////////////////////////////////////////////////
  // REQUEST EVENTS
  //////////////////////////////////////////////////////////

  REQUEST_CREATED:   "request:created",
  REQUEST_UPDATED:   "request:updated",

  //////////////////////////////////////////////////////////
  // SESSION EVENTS
  //////////////////////////////////////////////////////////

  SESSION_STARTED:   "session:started",
  SESSION_EXTENDED:  "session:extended",
  SESSION_CLOSED:    "session:closed",

  //////////////////////////////////////////////////////////
  // SYSTEM EVENTS
  //////////////////////////////////////////////////////////

  AUTHENTICATED:     "socket:authenticated",
  ERROR:             "socket:error",
};

//////////////////////////////////////////////////////////
// PAYLOAD BUILDERS
//
// Every event has a standard payload shape.
// Routes call these builders — never construct
// raw payloads inline.
//
// Consistent shapes mean frontend can rely on
// the same structure for every event of the same type.
//////////////////////////////////////////////////////////

const PAYLOADS = {

  //////////////////////////////////////////////////////////
  // TASK PAYLOAD
  // Used by: newTask, taskUpdated, taskReassigned
  //////////////////////////////////////////////////////////

  task: (task, meta = {}) => ({
    task: {
      id:           task.id,
      propertyId:   task.propertyId,
      itemName:     task.itemName,
      status:       task.status,
      priority:     task.priority,
      assignedToId: task.assignedToId,
      createdAt:    task.createdAt,
      updatedAt:    task.updatedAt,
    },
    ...meta,
    timestamp: new Date().toISOString(),
  }),

  //////////////////////////////////////////////////////////
  // CALL PAYLOAD
  //////////////////////////////////////////////////////////

  call: (call, task, meta = {}) => ({
    call: {
      id:         call.id,
      propertyId: call.propertyId,
      roomNumber: call.roomNumber,
      urgency:    call.urgency,
      createdAt:  call.createdAt,
    },
    task: task
      ? {
          id:           task.id,
          status:       task.status,
          priority:     task.priority,
          assignedToId: task.assignedToId,
        }
      : null,
    ...meta,
    timestamp: new Date().toISOString(),
  }),

  //////////////////////////////////////////////////////////
  // ORDER PAYLOAD
  //////////////////////////////////////////////////////////

  order: (order, tasks = [], meta = {}) => ({
    order: {
      id:         order.id,
      propertyId: order.propertyId,
      roomNumber: order.roomNumber,
      status:     order.status,
      createdAt:  order.createdAt,
    },
    taskCount: tasks.length,
    tasks:     tasks.map((t) => ({
      id:           t.id,
      itemName:     t.itemName,
      assignedToId: t.assignedToId,
      priority:     t.priority,
    })),
    ...meta,
    timestamp: new Date().toISOString(),
  }),

  //////////////////////////////////////////////////////////
  // REQUEST PAYLOAD
  //////////////////////////////////////////////////////////

  request: (request, task, meta = {}) => ({
    request: {
      id:           request.id,
      propertyId:   request.propertyId,
      roomNumber:   request.roomNumber,
      serviceItemId: request.serviceItemId,
      note:         request.note,
      status:       request.status,
      createdAt:    request.createdAt,
    },
    task: task
      ? {
          id:           task.id,
          itemName:     task.itemName,
          assignedToId: task.assignedToId,
          priority:     task.priority,
        }
      : null,
    ...meta,
    timestamp: new Date().toISOString(),
  }),

  //////////////////////////////////////////////////////////
  // SESSION PAYLOAD
  //////////////////////////////////////////////////////////

  session: (session, meta = {}) => ({
    session: {
      id:         session.id,
      roomNumber: session.roomNumber,
      propertyId: session.propertyId,
      status:     session.status,
      expiresAt:  session.expiresAt,
    },
    ...meta,
    timestamp: new Date().toISOString(),
  }),
};

//////////////////////////////////////////////////////////
// CORE EMISSION FUNCTIONS
//////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////
// GET io FROM APP
// Routes pass req.app.get("io") — centralise the
// null check here so routes never need to check
//////////////////////////////////////////////////////////

function getIo(io) {
  if (!io) {
    console.warn("⚠️  Socket.IO not available. Event not emitted.");
    return null;
  }
  return io;
}

//////////////////////////////////////////////////////////
// EMIT TO PROPERTY ROOM
//
// Primary emission function.
// All staff and admins connected to this property
// receive the event.
//
// Parameters:
//   io          — socket.io server instance
//   propertyId  — scopes event to correct property
//   event       — event name from EVENTS registry
//   payload     — event data from PAYLOADS builders
//////////////////////////////////////////////////////////

function emitToProperty(io, propertyId, event, payload) {
  const socket = getIo(io);
  if (!socket) return false;

  if (!propertyId) {
    console.warn("⚠️  emitToProperty: propertyId missing. Event not emitted.");
    return false;
  }

  socket.to(`property:${propertyId}`).emit(event, payload);

  console.log(
    `📡 [property:${propertyId}] ${event}`
  );

  return true;
}

//////////////////////////////////////////////////////////
// EMIT TO SPECIFIC USER
//
// Direct notification to one staff member or admin.
// Used for: personal task assignments, direct alerts.
//
// Parameters:
//   io      — socket.io server instance
//   userId  — target user ID
//   event   — event name from EVENTS registry
//   payload — event data
//////////////////////////////////////////////////////////

function emitToUser(io, userId, event, payload) {
  const socket = getIo(io);
  if (!socket) return false;

  if (!userId) {
    console.warn("⚠️  emitToUser: userId missing. Event not emitted.");
    return false;
  }

  socket.to(`user:${userId}`).emit(event, payload);

  console.log(
    `📡 [user:${userId}] ${event}`
  );

  return true;
}

//////////////////////////////////////////////////////////
// EMIT TO PROPERTY AND ASSIGNED STAFF
//
// Emits to the whole property room AND sends a
// personal notification to the assigned staff member.
//
// Used for: new task assignment — staff gets personal
// alert in addition to property-wide broadcast.
//////////////////////////////////////////////////////////

function emitTaskAssigned(io, propertyId, assignedToId, event, payload) {
  const socket = getIo(io);
  if (!socket) return false;

  //////////////////////////////////////////////////////////
  // BROADCAST TO ALL PROPERTY STAFF + ADMIN
  //////////////////////////////////////////////////////////

  emitToProperty(io, propertyId, event, payload);

  //////////////////////////////////////////////////////////
  // PERSONAL NOTIFICATION TO ASSIGNED STAFF
  // Only if task is actually assigned to someone
  //////////////////////////////////////////////////////////

  if (assignedToId) {
    emitToUser(io, assignedToId, event, {
      ...payload,
      personal: true,
      message:  "A new task has been assigned to you",
    });
  }

  return true;
}

//////////////////////////////////////////////////////////
// HIGH LEVEL EMISSION FUNCTIONS
//
// These are what routes call directly.
// Each function knows exactly which event name
// and payload builder to use.
//////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////
// NOTIFY NEW TASK
// Called by: callRoutes, orderRoutes, requestRoutes
//////////////////////////////////////////////////////////

function notifyNewTask(io, task) {
  return emitTaskAssigned(
    io,
    task.propertyId,
    task.assignedToId,
    EVENTS.NEW_TASK,
    PAYLOADS.task(task, { message: "New task assigned" })
  );
}

//////////////////////////////////////////////////////////
// NOTIFY TASK UPDATED
// Called by: taskRoutes (status change)
//////////////////////////////////////////////////////////

function notifyTaskUpdated(io, task) {
  return emitToProperty(
    io,
    task.propertyId,
    EVENTS.TASK_UPDATED,
    PAYLOADS.task(task, { message: "Task status updated" })
  );
}

//////////////////////////////////////////////////////////
// NOTIFY TASK REASSIGNED
// Called by: callAdminRoutes, taskRoutes (assign)
//////////////////////////////////////////////////////////

function notifyTaskReassigned(io, task, previousAssigneeId = null) {

  //////////////////////////////////////////////////////////
  // NOTIFY PROPERTY
  //////////////////////////////////////////////////////////

  emitToProperty(
    io,
    task.propertyId,
    EVENTS.TASK_REASSIGNED,
    PAYLOADS.task(task, { message: "Task reassigned" })
  );

  //////////////////////////////////////////////////////////
  // NOTIFY NEW ASSIGNEE PERSONALLY
  //////////////////////////////////////////////////////////

  if (task.assignedToId) {
    emitToUser(
      io,
      task.assignedToId,
      EVENTS.TASK_REASSIGNED,
      PAYLOADS.task(task, {
        personal: true,
        message:  "A task has been assigned to you",
      })
    );
  }

  //////////////////////////////////////////////////////////
  // NOTIFY PREVIOUS ASSIGNEE — task removed from their queue
  //////////////////////////////////////////////////////////

  if (previousAssigneeId && previousAssigneeId !== task.assignedToId) {
    emitToUser(
      io,
      previousAssigneeId,
      EVENTS.TASK_REASSIGNED,
      PAYLOADS.task(task, {
        personal: true,
        message:  "A task has been removed from your queue",
        removed:  true,
      })
    );
  }

  return true;
}

//////////////////////////////////////////////////////////
// NOTIFY NEW CALL
// Called by: callRoutes
//////////////////////////////////////////////////////////

function notifyNewCall(io, call, task) {
  return emitTaskAssigned(
    io,
    call.propertyId,
    task?.assignedToId,
    EVENTS.CALL_CREATED,
    PAYLOADS.call(call, task, { message: "Guest call received" })
  );
}

//////////////////////////////////////////////////////////
// NOTIFY NEW ORDER
// Called by: orderRoutes
//////////////////////////////////////////////////////////

function notifyNewOrder(io, order, tasks = []) {

  //////////////////////////////////////////////////////////
  // EMIT ORDER EVENT TO PROPERTY
  //////////////////////////////////////////////////////////

  emitToProperty(
    io,
    order.propertyId,
    EVENTS.ORDER_CREATED,
    PAYLOADS.order(order, tasks, { message: "New order placed" })
  );

  //////////////////////////////////////////////////////////
  // EMIT INDIVIDUAL TASK NOTIFICATIONS TO ASSIGNEES
  // Each task may be assigned to a different staff member
  //////////////////////////////////////////////////////////

  tasks.forEach((task) => {
    if (task.assignedToId) {
      emitToUser(
        io,
        task.assignedToId,
        EVENTS.NEW_TASK,
        PAYLOADS.task(task, {
          personal: true,
          message:  "New order task assigned to you",
        })
      );
    }
  });

  return true;
}

//////////////////////////////////////////////////////////
// NOTIFY NEW REQUEST
// Called by: requestRoutes
//////////////////////////////////////////////////////////

function notifyNewRequest(io, request, task) {
  return emitTaskAssigned(
    io,
    request.propertyId,
    task?.assignedToId,
    EVENTS.REQUEST_CREATED,
    PAYLOADS.request(request, task, { message: "New service request" })
  );
}

//////////////////////////////////////////////////////////
// NOTIFY SESSION CLOSED
// Called by: sessionRoutes (checkout)
//////////////////////////////////////////////////////////

function notifySessionClosed(io, session) {
  return emitToProperty(
    io,
    session.propertyId,
    EVENTS.SESSION_CLOSED,
    PAYLOADS.session(session, {
      message: `Room ${session.roomNumber} is now available`,
    })
  );
}

//////////////////////////////////////////////////////////
// NOTIFY SESSION EXTENDED
// Called by: sessionRoutes (extend)
//////////////////////////////////////////////////////////

function notifySessionExtended(io, session) {
  return emitToProperty(
    io,
    session.propertyId,
    EVENTS.SESSION_EXTENDED,
    PAYLOADS.session(session, {
      message: `Room ${session.roomNumber} stay extended`,
    })
  );
}

//////////////////////////////////////////////////////////
// EXPORTS
//////////////////////////////////////////////////////////

module.exports = {

  //////////////////////////////////////////////////////////
  // HIGH LEVEL — use these in routes
  //////////////////////////////////////////////////////////

  notifyNewTask,
  notifyTaskUpdated,
  notifyTaskReassigned,
  notifyNewCall,
  notifyNewOrder,
  notifyNewRequest,
  notifySessionClosed,
  notifySessionExtended,

  //////////////////////////////////////////////////////////
  // LOW LEVEL — use for custom events
  //////////////////////////////////////////////////////////

  emitToProperty,
  emitToUser,
  emitTaskAssigned,

  //////////////////////////////////////////////////////////
  // CONSTANTS — import in frontend and backend
  //////////////////////////////////////////////////////////

  EVENTS,
  PAYLOADS,
};