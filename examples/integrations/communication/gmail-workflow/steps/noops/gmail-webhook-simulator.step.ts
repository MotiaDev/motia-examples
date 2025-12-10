import { NoopConfig } from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Gmail Webhook Simulator',
  description: 'This node is used to simulate a Gmail webhook.',
  virtualEmits: [{
    topic: 'api.gmail.webhook',
    label: 'Simulated Gmail Webhook',
  }],
  virtualSubscribes: [],
  flows: ['gmail-flow'],
}
