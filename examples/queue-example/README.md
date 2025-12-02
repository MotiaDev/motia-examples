# Motia + BullMQ Queue System Demo

A production-ready demonstration of Motia's BullMQ adapter showcasing enterprise-grade queue processing capabilities.

![Motia + BullMQ Queue System Demo](./img/bullmq-plugin.png)

## 🚀 What This Demonstrates

This project showcases **why production systems need robust queue infrastructure** beyond simple prototypes:

- ✅ **Automatic Retry Mechanisms** - Exponential backoff for transient failures
- ✅ **Dead Letter Queue (DLQ)** - Handling permanent failures that need human intervention
- ✅ **Parallel Processing** - Concurrent job execution with configurable concurrency
- ✅ **Event Chaining** - Multi-step workflows with isolated failure handling
- ✅ **DLQ Recovery** - Manual retry and discard capabilities for failed messages
- ✅ **State Management** - Persistent state within queue handlers
- ✅ **Observability** - Full visibility into queue processing in Workbench

## 🎯 Key Features Showcased

### 1. Retry Mechanisms
Jobs automatically retry with exponential backoff (1s → 2s → 4s) when transient failures occur. This prevents 3am wakeup calls for temporary network issues.

### 2. Dead Letter Queue
Permanently failed jobs are routed to DLQ for review. In production, this would trigger alerts (Slack/PagerDuty) and store failures for manual recovery.

### 3. Parallel Processing
Process multiple jobs simultaneously with configurable concurrency limits. Balance throughput vs. resource usage.

### 4. Event Chaining
Multi-step workflows where each step can have independent retry policies. Failures are isolated to the failed step.

## Quick Start

```bash
# Start the development server
npm run dev
# or
yarn dev
# or
pnpm dev
```

This starts the Motia runtime and the **Workbench** - a powerful UI for developing and debugging your workflows. By default, it's available at [`http://localhost:3000`](http://localhost:3000).

1. **Open the Workbench** in your browser at [`http://localhost:3000`](http://localhost:3000)
2. **Select the `queue-tests` flow** in the Workbench to see the queue system visualization
3. **Use the demo script** to trigger various queue scenarios:
   ```bash
   chmod +x scripts/demo-bullmq-power.sh
   ./scripts/demo-bullmq-power.sh
   ```
4. **Watch the processing** in Workbench - you'll see:
   - Events flowing through the queue system
   - Retry attempts with exponential backoff
   - DLQ routing for permanent failures
   - Parallel job processing
   - Event chaining across multiple steps

## Step Types

Every Step has a `type` that defines how it triggers:

| Type | When it runs | Use case |
|------|--------------|----------|
| **`api`** | HTTP request | REST APIs, webhooks |
| **`event`** | Event emitted | Background jobs, workflows |
| **`cron`** | Schedule | Cleanup, reports, reminders |

## Development Commands

```bash
# Start Workbench and development server
npm run dev
# or
yarn dev
# or
pnpm dev

# Generate TypeScript types from Step configs
npm run generate-types
# or
yarn generate-types
# or
pnpm generate-types

# Build project for deployment
npm run build
# or
yarn build
# or
pnpm build
```

## Project Structure

```
steps/              # Your Step definitions (or use src/)
src/                # Shared services and utilities
motia.config.ts     # Motia configuration
```

Steps are auto-discovered from your `steps/` or `src/` directories - no manual registration required.

## 🎓 Queue Examples

### Trigger Queue Tests

**POST** `/queue-tests/trigger`

```json
{
  "testType": "error",
  "failureCount": 2
}
```

Available test types:
- `simple` - Basic queue processing
- `chain` - Multi-step workflow (3 steps)
- `parallel` - Concurrent processing (5 workers)
- `heavy` - Long-running jobs with progress tracking
- `state` - State management within queue handlers
- `error` - Retry mechanism demonstration (fails N times, then succeeds)
- `error-permanent` - Permanent failure → DLQ routing
- `all` - Run all test types

### View Test Results

**GET** `/queue-tests/results`

See all completed queue tests with processing times and status.

### Dead Letter Queue Management

**GET** `/queue-tests/dlq` - List all DLQ entries  
**POST** `/queue-tests/dlq/retry/:id` - Retry a failed message  
**DELETE** `/queue-tests/dlq/:id` - Discard a DLQ entry

### Example: Watch Retry in Action

1. Trigger an error test:
   ```bash
   curl -X POST http://localhost:3000/queue-tests/trigger \
     -H "Content-Type: application/json" \
     -d '{"testType": "error", "failureCount": 2}'
   ```

2. Watch Workbench logs - you'll see:
   - 💥 Attempt 1: FAIL (retry in 1s)
   - 💥 Attempt 2: FAIL (retry in 2s)
   - ✅ Attempt 3: SUCCESS (recovered!)

3. Check results:
   ```bash
   curl http://localhost:3000/queue-tests/results?testType=error-recovery
   ```

## 📊 Workbench Visualization

The Workbench shows the complete queue flow:
- **Left**: Trigger API (entry point)
- **Middle**: Queue processors (simple, chain, parallel, error)
- **Right**: DLQ flow (error → dlq-handler → dlq-list/retry/discard)
- **Bottom**: Management APIs (health-check, results, clear)

Watch events flow through the system in real-time!

## Learn More

- [Documentation](https://motia.dev/docs) - Complete guides and API reference
- [Quick Start Guide](https://motia.dev/docs/getting-started/quick-start) - Detailed getting started tutorial
- [Core Concepts](https://motia.dev/docs/concepts/overview) - Learn about Steps and Motia architecture
- [Discord Community](https://discord.gg/motia) - Get help and connect with other developers

