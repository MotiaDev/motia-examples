const DISCORD_WEBHOOK =
  "YOUR_WEBHOOK_URL"; // Add your Discord webhook URL here

// Smart alerting with rate limiting
const alertHistory = new Map();

function shouldSendAlert(website) {
    const lastAlert = alertHistory.get(website);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    // Only alert once every 5 minutes per website
    return !lastAlert || lastAlert < fiveMinutesAgo;
}

async function sendSmartAlert(incident) {
    if (!shouldSendAlert(incident.website)) {
        console.log(`Skipping alert for ${incident.website} (rate limited)`);
        return;
    }

    const embed = {
        title: "Website Incident Detected",
        description: `**${incident.website}** is experiencing issues`,
        fields: [
            {
                name: "Error",
                value: incident.error || "Unknown error",
                inline: true,
            },
            {
                name: "Time",
                value: new Date(incident.timestamp).toLocaleString(),
                inline: true,
            },
        ],
        color: 0xff0000,
        footer: {
            text: "Powered by Motia Backend Framework",
        },
    };

    try {
        await fetch(DISCORD_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] }),
        });
        alertHistory.set(incident.website, Date.now());
        console.log(`Smart alert sent for ${incident.website}`);
    } catch (error) {
        console.error("Failed to send alert:", error.message);
    }
}

exports.config = {
    type: "event",
    name: "Smart Alerter",
    subscribes: ["incident.detected"],
    flows: ["Alerting"],
    emits: [],
};

exports.handler = async (context) => {
    console.log("Alerter called");
    console.log("Context keys:", Object.keys(context));
    
    // The event data is directly on the context object
    let incident = {
        website: context.website,
        error: context.error,
        timestamp: context.timestamp
    };

    console.log(`Processing incident for ${incident.website}`);
    
    try {
        await sendSmartAlert(incident);
        return {
            status: 200,
            body: { message: "Alert processed", website: incident.website },
        };
    } catch (error) {
        console.error("Alert processing error:", error);
        return { status: 500, body: { error: error.message } };
    }
};