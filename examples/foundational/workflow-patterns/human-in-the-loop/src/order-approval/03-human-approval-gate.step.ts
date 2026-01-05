import type { NoopConfig } from 'motia'

/**
 * Visual gate showing where workflow pauses for human approval.
 * This Noop connects the risk analysis to the approval webhook,
 * demonstrating the human-in-the-loop re-entry pattern.
 */

export const config: NoopConfig = {
  type: 'noop',
  name: 'HumanApprovalGate',
  description: 'Workflow pauses here - awaiting human decision via webhook',
  flows: ['order-approval'],
  
  // Receives the signal that approval is needed
  virtualSubscribes: ['approval.required'],
  
  // Shows connection to the webhook that continues the flow
  virtualEmits: ['human.decision'],
}

