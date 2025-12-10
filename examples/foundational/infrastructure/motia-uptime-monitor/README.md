# Motia Uptime Monitor

A real-time event-driven uptime monitoring system built on the Motia framework. This system continuously monitors multiple websites, sends Discord alerts on status changes, and provides real-time streaming updates for dashboard integration.

## Features

- 🔄 **Continuous Monitoring**: Configurable cron-based website checking
- 🚨 **Smart Alerting**: Discord notifications with rate limiting to prevent spam
- 📊 **Status Tracking**: In-memory status storage and monitoring
- 🏥 **Health Monitoring**: Built-in health check endpoint
- 💾 **In-Memory State**: No database required - all state maintained in memory
- ⚡ **Event-Driven**: Reactive architecture using Motia's event system

## Architecture

The system follows an event-driven microservice architecture where each component has a single responsibility:

```
┌─────────────┐    check.requested    ┌──────────────┐    check.result    ┌─────────────┐
│ Cron        │ ────────────────────► │ Website      │ ─────────────────► │ Discord     │
│ Scheduler   │                       │ Checker      │                    │ Alerter     │
└─────────────┘                       └──────────────┘                    └─────────────┘
                                             │                                     │
                                             │ status.stream                       │
                                             ▼                                     ▼
                                      ┌──────────────┐                    ┌─────────────┐
                                      │ Status       │                    │ Rate        │
                                      │ Storage      │                    │ Limiter     │
                                      └──────────────┘                    └─────────────┘
```

### Components

#### Steps (Motia Components)
- **cron.step.js** - Periodic trigger that emits check requests for all configured sites
- **checker.step.js** - Performs HTTP checks and emits results with timing data
- **alerter.step.js** - Handles Discord notifications with status change detection
- **health.step.js** - Provides system health endpoint at `/healthz`

#### Utility Libraries
- **lib/env.js** - Environment variable parsing and validation
- **lib/streams.js** - In-memory status storage and snapshot management
- **lib/rate-limiter.js** - Token bucket rate limiting for Discord alerts

## Setup and Installation

### Prerequisites
- Node.js (v16 or higher)
- Motia framework
- Discord webhook URL (for alerts)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up Discord webhook:**
   - Go to your Discord server settings
   - Navigate to Integrations > Webhooks
   - Create a new webhook and copy the URL
   - Add the URL to your `.env` file

4. **Configure sites to monitor:**
   - Edit the `SITES` variable in `.env`
   - Use JSON array format: `["https://example.com","https://api.example.com"]`

5. **Start the monitoring system:**
   ```bash
   npm start
   ```

## Configuration

All configuration is done via environment variables. See `.env.example` for all available options.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_WEBHOOK` | Discord webhook URL for alerts | `https://discord.com/api/webhooks/123/abc` |
| `SITES` | JSON array of URLs to monitor | `["https://example.com","https://api.example.com"]` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHECK_INTERVAL_CRON` | `*/1 * * * *` | Cron expression for check frequency |
| `ALERT_BURST` | `3` | Max alerts per site within time window |
| `ALERT_WINDOW_SEC` | `300` | Rate limiting window in seconds |

### Cron Expression Examples

- `*/1 * * * *` - Every minute (default)
- `*/5 * * * *` - Every 5 minutes  
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours

## Usage

### Health Check

Check system status:
```bash
curl http://localhost:3000/healthz
```

Example response:
```json
{
  "status": "ok",
  "sitesConfigured": 3,
  "lastKnown": {
    "https://example.com": {
      "url": "https://example.com",
      "status": "UP",
      "code": 200,
      "responseTime": 245,
      "checkedAt": "2024-01-15T10:30:00.000Z",
      "error": null
    }
  },
  "now": "2024-01-15T10:35:00.000Z"
}
```

### Status Monitoring

The system maintains current status for all monitored sites in memory. You can check the current status of all sites using the health endpoint which provides a snapshot of the last known status for each configured site.

### Discord Alerts

The system automatically sends Discord notifications when:
- A site goes from UP to DOWN
- A site recovers from DOWN to UP

Alert format:
- 🔴 **Site DOWN**: `🔴 example.com is DOWN (500)`
- 🟢 **Site UP**: `🟢 example.com is UP`

Includes detailed embed with:
- Response time
- Status code
- Timestamp
- Error details (if applicable)

## Data Flow

### Event Flow
1. **Cron Trigger** → Emits `check.requested` events for each configured site
2. **Website Checker** → Receives `check.requested`, performs HTTP check
3. **Status Update** → Checker emits `check.result` with result
4. **Alert Processing** → Alerter receives `check.result`, detects status changes
5. **Discord Notification** → Alerter sends webhook if status changed and rate limit allows
6. **Status Storage** → Status is stored in memory for health endpoint access

### Status Determination
- **UP**: HTTP response received (any status code)
- **DOWN**: Network error, timeout, or connection failure

### Rate Limiting
- Uses token bucket algorithm per site
- Default: 3 alerts per 5-minute window
- Prevents spam during site flapping
- Tokens replenish automatically

## Expected Behavior

### Normal Operation
```
[INFO] Cron triggered, checking 3 sites
[INFO] Checking https://example.com
[INFO] example.com: UP (200) - 245ms
[INFO] Checking https://api.example.com  
[INFO] api.example.com: UP (200) - 156ms
[INFO] Status checks completed for 2 sites
```

### Status Change Detection
```
[INFO] example.com status changed: UP → DOWN
[INFO] Sending Discord alert for example.com (DOWN)
[INFO] Discord alert sent successfully
```

### Rate Limiting
```
[WARN] Rate limit exceeded for example.com, suppressing alert
[INFO] example.com: DOWN (timeout) - alert suppressed
```

## Troubleshooting

### Common Issues

**Sites not being checked:**
- Verify `SITES` environment variable is valid JSON
- Check cron expression syntax
- Review logs for parsing errors

**Discord alerts not working:**
- Verify `DISCORD_WEBHOOK` URL is correct
- Check Discord webhook permissions
- Review network connectivity

**High memory usage:**
- System maintains all status in memory
- Consider reducing check frequency for many sites
- Monitor with health endpoint

### Logging

All components use structured logging via `context.logger`:
- `context.logger.info()` - Normal operations
- `context.logger.error()` - Error conditions  
- `context.logger.debug()` - Detailed tracing

**Note**: `console.log()` is forbidden and will cause validation failures.

## Development

### Project Structure
```
├── steps/                 # Motia step implementations
│   ├── cron.step.js      # Periodic check scheduler
│   ├── checker.step.js   # HTTP website checker
│   ├── alerter.step.js   # Discord notification handler
│   └── health.step.js    # Health check endpoint
├── lib/                  # Utility libraries
│   ├── env.js           # Environment configuration
│   ├── streams.js       # In-memory status management
│   └── rate-limiter.js  # Token bucket rate limiting
├── .env.example         # Configuration template
└── README.md           # This file
```

### Testing
```bash
# Run unit tests
npm test

# Run integration tests  
npm run test:integration

# Validate requirements compliance
npm run validate
```

### Contributing
1. Follow the event-driven architecture patterns
2. Use `context.logger` for all logging (never `console.log`)
3. Maintain single responsibility per step
4. Add tests for new functionality
5. Update documentation for configuration changes

## License

MIT License - see LICENSE file for details.