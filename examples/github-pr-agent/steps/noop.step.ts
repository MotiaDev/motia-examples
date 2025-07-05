import { NoopConfig } from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Flow Starter',
  description: 'Start the default flow',
  virtualSubscribes: [],
  virtualEmits: [{
    topic: '/triage-pr',
    label: 'Triage PR',
  }],
  flows: ['default'],
} 