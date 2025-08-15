const storage = require("../lib/database");

exports.config = {
  type: "api",  // This step exposes an API endpoint
  name: "Dashboard",
  method: "GET", // It's a read-only endpoint
  path: "/dashboard", // Accessible via http://localhost:3000/dashboard
  flows: ["Dashboard"], // Part of the "Dashboard" flow 
  emits: [], // This step doesn't emit any events
};

exports.handler = async (context) => {
  const allStatus = await storage.getStatus();
  const websites = await Promise.all(
    allStatus.map(async ([website, status]) => ({
      website,
      ...status,
      uptime: await storage.calculateUptime(website),
    }))
  );

  const summary = {
    total: websites.length,
    up: websites.filter((w) => w.status === "up").length,
    down: websites.filter((w) => w.status === "down").length,
    avgUptime: Math.round(
      websites.reduce((sum, w) => sum + w.uptime, 0) / websites.length || 0
    ),
  };

  const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Uptime Monitor Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            color: white;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #333;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .website-card {
            background: #333;
            padding: 20px;
            margin: 10px 0;
            border-radius: 10px;
            border-left: 4px solid #28a745;
        }
        .website-card.down {
            border-left-color: #dc3545;
        }
        .website-url {
            font-size: 1.2rem;
            margin-bottom: 10px;
        }
        .website-details {
            display: flex;
            justify-content: space-between;
            font-size: 0.9rem;
            color: #ccc;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Uptime Monitor</h1>
            <p>Real-time website monitoring dashboard</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value" style="color: #17a2b8;">${summary.total}</div>
                <div>Total Sites</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #28a745;">${summary.up}</div>
                <div>Online</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #dc3545;">${summary.down}</div>
                <div>Offline</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #6f42c1;">${summary.avgUptime}%</div>
                <div>Avg Uptime</div>
            </div>
        </div>

        <div class="websites">
            ${websites.length === 0 ? 
                '<div style="text-align: center; padding: 40px;"><h3>No websites monitored yet</h3></div>' :
                websites.map(site => `
                    <div class="website-card ${site.status === 'down' ? 'down' : ''}">
                        <div class="website-url">
                            ${site.status === 'up' ? '✅' : '❌'} ${site.website}
                        </div>
                        <div class="website-details">
                            <span>Uptime: ${site.uptime}%</span>
                            ${site.responseTime ? `<span>Response: ${site.responseTime}ms</span>` : ''}
                            <span>Last checked: ${new Date(site.timestamp).toLocaleString()}</span>
                        </div>
                    </div>
                `).join('')
            }
        </div>

        <div style="text-align: center; margin-top: 30px; color: #666;">
            <p>Powered by Motia Backend Framework</p>
            <p>Last updated: ${new Date().toLocaleString()}</p>
        </div>
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;

console.log(html)

  return {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
    body: html,
  };
};
