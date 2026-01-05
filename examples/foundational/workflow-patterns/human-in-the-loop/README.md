# Human-in-the-Loop Workflow Example

**Build workflows that pause for human input and resume when ready**

This example answers: *How does Motia handle workflows that run for hours/days and pause waiting for external signals (like a user clicking a button)?*

## 🎯 The Answer

In Motia:
1. **Save state** after each step  
2. **Workflow pauses** by saving "awaiting" status (no emit)
3. **Webhook API restarts the flow** when external system calls it

No magic. Just state + API steps as re-entry points.

## 🔄 The Flow

[workflow-visualization.png](docs/img/workbench.png)

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open [`http://localhost:3000`](http://localhost:3000) - you'll see the **HumanApprovalGate Noop** with red/green buttons showing where the workflow pauses.

### Test It

**Submit high-risk order (will pause):**

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"name": "Expensive Item", "price": 500, "quantity": 3}],
    "customerEmail": "test@example.com",
    "total": 1500
  }'
```

Response: `{"orderId": "abc-123", "status": "awaiting_approval"}`

**Workflow is paused** - check Workbench, the flow stops at HumanApprovalGate.

**Resume it (minutes/hours/days later):**

```bash
curl -X POST http://localhost:3000/webhooks/orders/abc-123/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "approvedBy": "manager@company.com",
    "notes": "Verified"
  }'
```

**Workflow continues** - loads state, emits `order.approved`, completes fulfillment.

### Run Test Script

```bash
./test-htl-flow.sh
```

## 🎨 In Workbench

You'll see **6 nodes**:

1. **SubmitOrder** (green) - API entry point
2. **AnalyzeRisk** (blue) - Risk calculation
3. **HumanApprovalGate** (gray Noop) - ⏸️ **Pause indicator with [Approve ✓] [Reject ✗] buttons**
4. **ApprovalWebhook** (green) - Re-entry point
5. **CompleteOrder** (blue) - Final fulfillment
6. **DetectTimeouts** (purple Cron) - Background timeout detection (runs every 5 min)

The **virtual connections** (dashed lines) show:
- `approval.required` → HumanApprovalGate
- `human.decision` → ApprovalWebhook

This visualizes exactly where external systems restart the flow.

## 💡 How It Works

### The Pattern

**Step 1:** Save state when you need to pause

```typescript
// In AnalyzeRisk
if (riskScore > 70) {
  order.status = 'awaiting_approval'  // Pause indicator
  order.currentStep = 'awaiting_approval'
  await state.set('orders', orderId, order)  // Save checkpoint
  
  // Don't emit regular event - workflow stops here
  logger.warn('Order requires approval - workflow paused')
}
```

**Step 2:** Create webhook API as re-entry point

```typescript
// ApprovalWebhook API
const order = await state.get('orders', orderId)  // Load checkpoint

// Verify we're paused at right place
if (order.currentStep !== 'awaiting_approval') {
  return { status: 400, body: { error: 'Not awaiting approval' } }
}

// Update and continue
order.status = 'approved'
await state.set('orders', orderId, order)
await emit({ topic: 'order.approved', data: { orderId } })  // Resume!
```

**Step 3:** External system calls the webhook when ready

```typescript
// User clicks button in UI → makes API call
fetch('/webhooks/orders/abc-123/approve', {
  method: 'POST',
  body: JSON.stringify({ approved: true, approvedBy: 'user@email.com' })
})
```

### Virtual Connections (Visualization Only)

The Noop uses `virtualSubscribes` and `virtualEmits` to show flow:

```typescript
export const config: NoopConfig = {
  type: 'noop',
  name: 'HumanApprovalGate',
  virtualSubscribes: ['approval.required'],  // From AnalyzeRisk
  virtualEmits: ['human.decision'],          // To ApprovalWebhook
  flows: ['order-approval']
}
```

These **don't affect execution** - they only create visual connections in Workbench.

## 📋 State Structure

```typescript
{
  id: 'abc-123',
  status: 'awaiting_approval',     // Current state
  currentStep: 'awaiting_approval', // Where we paused
  completedSteps: ['submitted', 'risk_analysis'],  // What's done
  
  riskScore: 85,
  requiresApproval: true,
  
  // Timestamps
  createdAt: '2026-01-05T10:00:00Z',
  updatedAt: '2026-01-05T10:00:02Z',
  
  // Approval tracking (filled in by webhook)
  approvedBy: null,
  approvedAt: null,
}
```

## 🎯 Key Insights

> **From Mike Piccolo (Motia Creator):**
> "Workflows are just loosely coupled groups of steps. Build up state as you go. Your workflow doesn't have a concept of time - only if the right state is present and the step has been invoked."

### Motia vs. Temporal

| Concept | Temporal | Motia |
|---------|----------|-------|
| **Durability** | Event replay (automatic) | State checkpointing (explicit) |
| **Pause/Resume** | Sleep/await activities | Save state + webhook re-entry |
| **Complexity** | Magic replays | You control what/when to save |
| **Transparency** | Hidden event history | Visible state checkpoints |

**Motia is simpler** - you explicitly save what matters and use regular APIs as re-entry points.

## 🔧 Production Patterns

### Timeout Detection (Included)

**`06-detect-timeouts.step.ts`** - Cron job that runs every 5 minutes (demo) to detect stuck approvals:

```typescript
export const config: CronConfig = {
  type: 'cron',
  cron: '*/5 * * * *',  // Every 5 minutes (use hourly in production)
  name: 'DetectTimeouts',
}

export const handler = async ({ state, logger }) => {
  const orders = await state.getGroup('orders')
  const timeoutMs = 10 * 60 * 1000  // 10 minutes (use 24 hours in production)
  
  for (const order of orders) {
    if (order.status === 'awaiting_approval') {
      const age = Date.now() - new Date(order.updatedAt).getTime()
      
      if (age > timeoutMs) {
        logger.warn('Approval timeout detected', { orderId: order.id })
        
        // Mark as timed out
        order.status = 'timeout'
        order.timeoutAt = new Date().toISOString()
        await state.set('orders', order.id, order)
        
        // In production: escalate to manager, send urgent notification
      }
    }
  }
}
```

**Test it:** Submit a high-risk order, don't approve it, wait 10+ minutes - the cron will detect and mark it as timed out.

### Send Notifications

```typescript
// When high risk detected
if (riskScore > 70) {
  order.status = 'awaiting_approval'
  await state.set('orders', orderId, order)
  
  // Notify via Slack/Email
  await sendSlackMessage({
    channel: '#approvals',
    text: `Order ${orderId} needs approval`,
    blocks: [{
      type: 'actions',
      elements: [
        { type: 'button', text: 'Approve', url: `...${orderId}/approve` },
        { type: 'button', text: 'Reject', style: 'danger', url: `...${orderId}/reject` }
      ]
    }]
  })
}
```

## 📝 License

Apache License 2.0

---

**Built with [Motia](https://motia.dev)** - Event-driven backend framework

**Compare to Temporal:** Explicit state checkpointing instead of event replay. You control what gets saved and when. Simpler, more transparent.
