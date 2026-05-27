//////////////////////////////////////////////////////////
// 🚀 RICC DIGITAL — SERVER
//////////////////////////////////////////////////////////

require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const http       = require("http");
const helmet     = require("helmet");
const morgan     = require("morgan");
const compression = require("compression");
const { Server } = require("socket.io");

//////////////////////////////////////////////////////////
// INTERNAL IMPORTS
//////////////////////////////////////////////////////////

const prisma            = require("./prismaClient");
const { verifyToken }   = require("./utils/jwt");
const { globalLimiter } = require("./middleware/rateLimiter");
const errorHandler      = require("./middleware/errorHandler");

//////////////////////////////////////////////////////////
// ROUTE IMPORTS
//////////////////////////////////////////////////////////

const authRoutes        = require("./routes/authRoutes");
const bookingRoutes     = require("./routes/bookingRoutes");
const sessionRoutes     = require("./routes/sessionRoutes");
const orderRoutes       = require("./routes/orderRoutes");
const requestRoutes     = require("./routes/requestRoutes");
const taskRoutes        = require("./routes/taskRoutes");
const callRoutes        = require("./routes/callRoutes");
const callAdminRoutes   = require("./routes/callAdminRoutes");
const propertyRoutes    = require("./routes/propertyRoutes");
const categoryRoutes    = require("./routes/categoryRoutes");
const serviceItemRoutes = require("./routes/serviceItemRoutes");

//////////////////////////////////////////////////////////
// APP + SERVER
//////////////////////////////////////////////////////////

const app    = express();
const server = http.createServer(app);

//////////////////////////////////////////////////////////
// SOCKET.IO — CORS FROM ENV
//////////////////////////////////////////////////////////

const io = new Server(server, {
  cors: {
    origin:  process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

//////////////////////////////////////////////////////////
// SOCKET.IO — ROOM AUTHENTICATION
// Client sends token on connect → joins property room
// All realtime events scoped to property
//////////////////////////////////////////////////////////

io.on("connection", (socket) => {

  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on("authenticate", ({ token }) => {
    try {

      //////////////////////////////////////////////////////////
      // DECODE TO GET ROLE FIRST
      // Then verify with role-specific secret
      //////////////////////////////////////////////////////////

      const jwt    = require("jsonwebtoken");
      const decoded = jwt.decode(token);

      if (!decoded || !decoded.role) {
        socket.disconnect();
        return;
      }

      //////////////////////////////////////////////////////////
      // VERIFY WITH ROLE-SPECIFIC SECRET
      //////////////////////////////////////////////////////////

      const verified = verifyToken(token, decoded.role);

      //////////////////////////////////////////////////////////
      // JOIN PROPERTY ROOM + PERSONAL ROOM
      //////////////////////////////////////////////////////////

      socket.join(`property:${verified.propertyId}`);
      socket.join(`user:${verified.id}`);

      socket.emit("authenticated", {
        message: "Socket authenticated",
        propertyId: verified.propertyId,
        userId: verified.id,
      });

      console.log(
        `✅ Socket authenticated | User: ${verified.id} | Property: ${verified.propertyId}`
      );

    } catch (error) {
      console.warn(`⚠️ Socket auth failed: ${socket.id}`);
      socket.disconnect();
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

//////////////////////////////////////////////////////////
// MAKE io AVAILABLE TO ALL ROUTES
//////////////////////////////////////////////////////////

app.set("io", io);

//////////////////////////////////////////////////////////
// CORE MIDDLEWARE
// Order matters — do not rearrange
//////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////
// 1. SECURITY HEADERS
//////////////////////////////////////////////////////////

app.use(helmet());

//////////////////////////////////////////////////////////
// 2. CORS — FROM ENV
//////////////////////////////////////////////////////////

app.use(cors({
  origin:      process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}));

//////////////////////////////////////////////////////////
// 3. COMPRESSION
//////////////////////////////////////////////////////////

app.use(compression());

//////////////////////////////////////////////////////////
// 4. BODY PARSING
//////////////////////////////////////////////////////////

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//////////////////////////////////////////////////////////
// 5. HTTP REQUEST LOGGING
// dev format: colored, concise — good for development
// combined format: Apache-style — better for production
//////////////////////////////////////////////////////////

app.use(morgan(
  process.env.NODE_ENV === "production" ? "combined" : "dev"
));

//////////////////////////////////////////////////////////
// 6. GLOBAL RATE LIMITER
// Applied after parsing so request data is available
//////////////////////////////////////////////////////////

app.use(globalLimiter);

//////////////////////////////////////////////////////////
// ROUTES
//////////////////////////////////////////////////////////

app.use("/api/auth",        authRoutes);
app.use("/api/bookings",    bookingRoutes);
app.use("/api/sessions",    sessionRoutes);
app.use("/api/orders",      orderRoutes);
app.use("/api/requests",    requestRoutes);
app.use("/api/tasks",       taskRoutes);
app.use("/api/calls",       callRoutes);
app.use("/api/call-admin",  callAdminRoutes);
app.use("/api/properties",  propertyRoutes);
app.use("/api/categories",  categoryRoutes);
app.use("/api/service-items", serviceItemRoutes);

//////////////////////////////////////////////////////////
// HEALTH ROUTES
//////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////
// BASIC HEALTH CHECK — public
//////////////////////////////////////////////////////////

app.get("/api/health", (req, res) => {
  res.json({
    status:      "ok",
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

//////////////////////////////////////////////////////////
// DATABASE HEALTH — protected, no business data exposed
//////////////////////////////////////////////////////////

app.get("/api/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status:   "ok",
      database: "connected",
    });
  } catch (err) {
    res.status(500).json({
      status:   "error",
      database: "unreachable",
    });
  }
});

//////////////////////////////////////////////////////////
// SOCKET TEST — development only
//////////////////////////////////////////////////////////

if (process.env.NODE_ENV === "development") {
  app.get("/api/socket-test", (req, res) => {
    res.json({
      status:        "ok",
      socketEnabled: !!req.app.get("io"),
    });
  });
}

//////////////////////////////////////////////////////////
// ROOT
//////////////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.json({
    name:        "Ricc Digital API",
    version:     "1.0.0",
    environment: process.env.NODE_ENV,
    status:      "running",
  });
});

//////////////////////////////////////////////////////////
// GLOBAL ERROR HANDLER — MUST BE LAST
//////////////////////////////////////////////////////////

app.use(errorHandler);

//////////////////////////////////////////////////////////
// START SERVER
//////////////////////////////////////////////////////////

const PORT = process.env.PORT || 5000;

//////////////////////////////////////////////////////////
// VERIFY DATABASE CONNECTION ON STARTUP
//////////////////////////////////////////////////////////

async function startServer() {
  try {
    await prisma.$connect();
    console.log("🗄️  Database: connected");
    const dbHost = process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] || "unknown";

    server.listen(PORT, () => {
    console.log(`\n🚀 Ricc Digital Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    console.log(`🗄️  Database:    PostgreSQL @ ${dbHost}`);
    console.log(`🔌 Socket.IO:   enabled`);
    console.log(`🌐 CORS:        ${process.env.CORS_ORIGIN}`);
    console.log(`📋 Routes:      11 route files registered\n`);
  });

  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("Server will not start without a database connection.");
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();