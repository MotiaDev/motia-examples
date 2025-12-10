import { NoopConfig } from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Trello Webhook Simulator',
  description: 'This node is used to simulate a Trello webhook.',
  virtualEmits: ['api.trello.webhook'],
  virtualSubscribes: [],
  flows: ['trello'],
}
