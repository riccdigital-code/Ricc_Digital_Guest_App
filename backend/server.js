require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const errorHandler = require("./middleware/errorHandler");

app.use(errorHandler);

// ✅ Import routes FIRST
const bookingRoutes = require("./routes/bookingRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const orderRoutes = require("./routes/orderRoutes");
const requestRoutes = require("./routes/requestRoutes");
const taskRoutes = require("./routes/taskRoutes");
const callRoutes = require("./routes/callRoutes");
const callAdminRoutes = require("./routes/callAdminRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const serviceItemRoutes = require("./routes/serviceItemRoutes");
const authRoutes = require("./routes/authRoutes");

// ✅ THEN create app
const app = express();

//////////////////////////////////////////////////////////
// CREATE HTTP SERVER
//////////////////////////////////////////////////////////
const server = http.createServer(app);

//////////////////////////////////////////////////////////
// CREATE SOCKET SERVER
//////////////////////////////////////////////////////////
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});


//////////////////////////////////////////////////////////
// SOCKET CONNECTION
//////////////////////////////////////////////////////////
io.on("connection", (socket) => {
  socket.on("authenticate", ({ propertyId, userId }) => {
    socket.join(`property:${propertyId}`);
    socket.join(`user:${userId}`);
  });
});

//////////////////////////////////////////////////////////
// MAKE io AVAILABLE EVERYWHERE
//////////////////////////////////////////////////////////
app.set("io", io);

// ✅ THEN middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ THEN routes
app.use("/api/bookings", bookingRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/admin/calls", callAdminRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/items", serviceItemRoutes);
app.use("/api/auth", authRoutes);

// ✅ Test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

//////////////////////////////////////////////////////////
// START SERVER
//////////////////////////////////////////////////////////
const PORT = 5000;

//////////////////////////////////////////////////////////
// GLOBAL ERROR HANDLER
//////////////////////////////////////////////////////////

app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err);

  res.status(500).json({
    error: "Internal server error",
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});