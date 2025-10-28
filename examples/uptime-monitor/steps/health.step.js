const storage = require("../lib/database");

exports.config = {
  type: "api",
  name: "Health Check",
  method: "GET",
  path: "/health",
  flows: ["System"],
  emits: [],
};

exports.handler = async (context) => {
  // Test database connection
  let dbStatus = "disconnected";
  try {
    await storage.connect();
    dbStatus = storage.connected ? "connected" : "fallback";
  } catch (error) {
    dbStatus = "error";
  }

  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: {
      status: "healthy",
      timestamp: new Date(),
      uptime: process.uptime(),
      database: dbStatus,
      version: "1.0.0",
      framework: "Motia",
    },
  };
};
