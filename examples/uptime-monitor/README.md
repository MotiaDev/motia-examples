# Motia Uptime Monitor Example

This example shows how to build a smart uptime monitor using the Motia backend framework.

It periodically checks a list of websites, tracks their status in MongoDB, sends smart alerts to a Discord channel via webhook, and exposes a dashboard and API for status monitoring.

---

## Features

- Checks multiple websites every minute (configurable)
- Stores status and history in MongoDB with automatic cleanup
- Sends rate-limited alerts to Discord when sites go down
- Provides a REST API endpoint to fetch status data
- Includes a real-time, beautifully styled dashboard
- Health check endpoint for system monitoring
- Built entirely using Motia’s unified, event-driven framework

---

## Setup Instructions

### 1. Create a Motia Project

```bash
npx motia@latest create uptime-monitor
cd uptime-monitor
```

### 2. Add Steps

Create the following step files inside the `steps/` folder:

- `monitor.step.js` — checks websites and emits events
- `alerter.step.js` — listens for incidents and sends Discord alerts
- `status-tracker.step.js` — saves website status in MongoDB
- `api-status.step.js` — REST API for website statuses
- `dashboard.step.js` — simple HTML dashboard
- `health.step.js` — health check endpoint

### 3. Get Your Discord Webhook URL

- Create a Discord server or use an existing one.
- Go to **Server Settings > Integrations > Webhooks**.
- Create a new webhook and copy its URL.
- Use this URL in the `DISCORD_WEBHOOK` constant.

### 4. Configure Websites and Discord Webhook

- Edit the `WEBSITES` array in `monitor.step.js` to include your target URLs.
- Replace the `DISCORD_WEBHOOK` with your Discord webhook URL.

### 5. Set Up MongoDB

- Make sure you have access to a MongoDB instance (local or Atlas).
- Set your MongoDB connection string in the environment variable `MONGODB_URI`.

### 6. Run Locally to Test

```bash
npm install
npm run dev
```

- The system will run scheduled checks, store data, send alerts, and serve the dashboard and APIs.

---

## How It Works

- The monitor step runs on a cron schedule to check all websites concurrently.
- It emits "site.checked" events with the check results.
- The status tracker listens for these events and updates MongoDB status and history.
- The alerter listens for "incident.detected" events and sends alerts to Discord, limiting alert frequency per site.
- The API step provides current status and uptime info via a REST endpoint.
- The dashboard serves a real-time HTML dashboard summarizing site statuses.
- The health check endpoint reports system and database health.

---

## Code Overview

- `WEBSITES`: List of URLs to monitor.
- `checkSite(url)`: Checks a single website’s status and response time.
- `sendSmartAlert(incident)`: Sends rate-limited Discord alerts.
- `storage` (in `lib/database.js`) — MongoDB integration for storing status and history
- Motia step configurations (`exports.config`) specify type (cron, event, api), triggers, and emitted events.
- Handler functions (`exports.handler`) implement the step logic.

---

## License

MIT License

---

Feel free to customize and expand this example to fit your needs!

---

*Built with ❤️ using [Motia](https://motia.dev)*

---
