const storage = require('../lib/database');

exports.config = {
  type: "api",
  name: "Status API",
  method: "GET",
  path: "/api/status",
  flows: ["API"],
  emits: [],
};

exports.handler = async (context) => {
  const allStatus = await storage.getStatus();
  
  const websites = await Promise.all(
    allStatus.map(async ([website, status]) => ({
      website,
      ...status,
      uptime: await storage.calculateUptime(website)
    }))
  );
  
  const summary = {
    total: websites.length,
    up: websites.filter(w => w.status === "up").length,
    down: websites.filter(w => w.status === "down").length,
    averageUptime: websites.reduce((sum, w) => sum + w.uptime, 0) / websites.length || 0
  };
  
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { summary, websites, timestamp: new Date() }
  };
};