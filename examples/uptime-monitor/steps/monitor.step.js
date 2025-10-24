const WEBSITES = [
  "https://shefali.dev",
  "https://cssnippets.shefali.dev",
  "https://example.invalid",
  "https://nonexistentwebsite.com",
  "https://styleshift.shefali.dev",
  "https://learnify.shefali.dev",
];

const DISCORD_WEBHOOK =
  "YOUR_WEBHOOK_URL"; // Add your Discord webhook URL here

async function checkSite(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    return {
      url,
      isUp: response.status >= 200 && response.status < 400,
      status: response.status,
    };
  } catch (error) {
    return {
      url,
      isUp: false,
      error: error.message,
    };
  }
}

async function sendAlert(downSites) {
  if (downSites.length === 0) return;

  const message = {
    embeds: [
      {
        title: "Websites Down!",
        description: downSites
          .map((site) => `${site.url} - ${site.error || "Error"}`)
          .join("\n"),
        color: 0xff0000,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    console.log("Discord alert sent!");
  } catch (error) {
    console.error("Failed to send Discord alert:", error.message);
  }
}

async function checkAll() {
  console.log("Checking websites...");
  const results = await Promise.all(WEBSITES.map(checkSite));

  results.forEach((result) => {
    console.log(`${result.url}: ${result.isUp ? "UP" : "DOWN"}`);
  });

  const downSites = results.filter((r) => !r.isUp);
  if (downSites.length > 0) {
    console.log("Sending Discord alert...");
    await sendAlert(downSites);
  }

  return results;
}

exports.config = {
  type: "cron",
  name: "Smart Uptime Monitor", 
  cron: "* * * * *",
  emits: ["site.checked", "incident.detected"],
  flows: ["Monitor"],
};

exports.handler = async (context) => {
  console.log("Checking websites...");
  
  const results = await Promise.all(WEBSITES.map(checkSite));
  
  // Emit events for each check
  for (const result of results) {
    await context.emit({
      topic: "site.checked",
      data: {
        website: result.url,
        status: result.isUp ? "up" : "down",
        responseTime: result.responseTime || 0,
        timestamp: new Date()
      }
    });
    console.log(`Emitted site.checked for ${result.url}`);
  }

  const downSites = results.filter((r) => !r.isUp);
  
  // Emit incident events instead of sending alerts directly
  for (const site of downSites) {
    await context.emit({
      topic: "incident.detected", 
      data: {
        website: site.url,
        error: site.error,
        timestamp: new Date()
      }
    });
    console.log(`Emitted incident.detected for ${site.url}`);
  }

  return {
    status: 200,
    body: { 
      message: "Check completed",
      summary: {
        total: results.length,
        up: results.filter(r => r.isUp).length,
        down: downSites.length
      }
    },
  };
};
