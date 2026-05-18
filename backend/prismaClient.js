//////////////////////////////////////////////////////////
// 🗄️ PRISMA CLIENT
// Singleton pattern — safe for development hot reloads
// Query logging in development
// Graceful shutdown on process termination
//////////////////////////////////////////////////////////

const { PrismaClient } = require("@prisma/client");

//////////////////////////////////////////////////////////
// QUERY LOGGING CONFIGURATION
// Development: log queries, errors, warnings
// Production: log errors and warnings only
// Never log queries in production — contains sensitive data
//////////////////////////////////////////////////////////

const logConfig =
  process.env.NODE_ENV === "development"
    ? [
        { emit: "event", level: "query"   },
        { emit: "event", level: "error"   },
        { emit: "event", level: "warn"    },
      ]
    : [
        { emit: "event", level: "error"   },
        { emit: "event", level: "warn"    },
      ];

//////////////////////////////////////////////////////////
// SINGLETON PATTERN
// Prevents multiple PrismaClient instances during
// development hot reloads (nodemon)
// global is not cleared between hot reloads
//////////////////////////////////////////////////////////

const globalWithPrisma = global;

if (!globalWithPrisma.prisma) {
  globalWithPrisma.prisma = new PrismaClient({
    log: logConfig,
  });

  //////////////////////////////////////////////////////////
  // DEVELOPMENT QUERY LOGGING
  // Shows SQL, duration, and params for every query
  // Helps identify N+1 problems and slow queries
  //////////////////////////////////////////////////////////

  if (process.env.NODE_ENV === "development") {

    globalWithPrisma.prisma.$on("query", (event) => {
      console.log("\n📊 PRISMA QUERY");
      console.log("   SQL:      ", event.query);
      console.log("   Params:   ", event.params);
      console.log("   Duration: ", `${event.duration}ms`);
    });

    globalWithPrisma.prisma.$on("warn", (event) => {
      console.warn("⚠️  Prisma Warning:", event.message);
    });
  }

  globalWithPrisma.prisma.$on("error", (event) => {
    console.error("❌ Prisma Error:", event.message);
  });
}

const prisma = globalWithPrisma.prisma;

//////////////////////////////////////////////////////////
// GRACEFUL SHUTDOWN
// Ensures Prisma disconnects cleanly when server stops
// Prevents connection pool exhaustion on Railway/Render
//////////////////////////////////////////////////////////

async function disconnectPrisma() {
  await prisma.$disconnect();
  console.log("🗄️  Prisma disconnected cleanly");
}

process.on("SIGTERM", async () => {
  console.log("📴 SIGTERM received — shutting down gracefully");
  await disconnectPrisma();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("📴 SIGINT received — shutting down gracefully");
  await disconnectPrisma();
  process.exit(0);
});

//////////////////////////////////////////////////////////
// EXPORT SINGLETON INSTANCE
//////////////////////////////////////////////////////////

module.exports = prisma;