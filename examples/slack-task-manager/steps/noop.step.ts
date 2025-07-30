import { NoopConfig } from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Flow Starter',
  description: 'Start the default flow',
  virtualSubscribes: [],
  virtualEmits: [{
    topic: '/slack/command',
    label: 'Task Created',
    
  }],
  flows: ['default'],

} 