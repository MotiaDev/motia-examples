const storage = require("../lib/database");

exports.config = {
    type: "event",
    name: "Status Tracker",
    subscribes: ["site.checked"],
    flows: ["StatusTracking"],
    emits: [],
};

exports.handler = async (context) => {
    console.log("Status tracker called");
    console.log("Context keys:", Object.keys(context));
    
    // The event data is directly on the context object
    let check = {
        website: context.website,
        status: context.status,
        responseTime: context.responseTime,
        timestamp: context.timestamp
    };

    console.log("Processing check:", check);
    
    try {
        await storage.updateStatus(check.website, check);
        console.log(`Successfully saved status for ${check.website}`);
        return { status: 200, body: { message: "Status updated" } };
    } catch (error) {
        console.error("Status update error:", error);
        return { status: 500, body: { error: error.message } };
    }
};