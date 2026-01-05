# Workflow Patterns

Essential workflow patterns for building robust, production-ready applications with Motia. This category will grow to include various workflow patterns like human-in-the-loop, parallel execution, saga patterns, and more.

## 📚 Examples

### [human-in-the-loop](./human-in-the-loop/)
**Level**: Intermediate  
**Concepts**: Long-Running Workflows, Human Approval, State Checkpointing, Webhook Re-Entry

Build workflows that pause for human decisions and resume when ready.

**What You'll Learn**:
- How to pause workflows by saving state (no special "wait" command needed)
- Using API steps as webhook re-entry points
- Auto vs. manual routing (bypass gate when possible)
- Visual approval gates with Noop steps
- State checkpointing for durability
- Idempotent step processing

**Key Features**:
- ⏸️ Workflow pauses naturally when state is saved without emitting
- 🔄 Webhook APIs restart the flow exactly where it left off
- 🎨 Visual Noop gate shows pause point with red/green buttons
- ✅ Low-risk orders bypass the gate automatically
- 🔒 High-risk orders stop and wait for human approval
- 📊 Complete audit trail in state

**Use Cases**:
- Order approvals (high-value purchases)
- Content moderation (review before publishing)
- Document signing (wait for signatures)
- Deployment approvals (manager sign-off)
- Support escalations (human agent takeover)

**Tech Stack**:
- TypeScript/JavaScript/Python
- Motia State Management
- Virtual Steps for visualization
- Custom Noop UI components

**⭐ Highlights**: 
- Answers the common question: "How does Motia handle workflows that pause and wait for external signals?"
- Simpler alternative to Temporal's durable execution
- Explicit state checkpointing (you control what/when to save)

---

## 🎯 Learning Path

1. Start with [human-in-the-loop](./human-in-the-loop/) to understand the core pattern
2. Apply to your use case (approvals, moderation, etc.)
3. Add production features (timeouts, notifications, audit trails)

## 🔗 Related

- [State Management Guide](../../../.cursor/rules/motia/state-management.mdc)
- [Virtual Steps Guide](../../../.cursor/rules/motia/virtual-steps.mdc)
- [API Steps Guide](../../../.cursor/rules/motia/api-steps.mdc)

---

**Built with [Motia](https://motia.dev)** - Event-driven backend framework

