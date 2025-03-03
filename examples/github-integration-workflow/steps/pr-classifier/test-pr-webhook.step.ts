import { GithubWebhookEndpoint } from '../../types/github-events'
import type { NoopConfig } from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Test PR Webhook',
  description: 'Simulates GitHub PR webhook events for testing',
  virtualEmits: [
    {
      topic: GithubWebhookEndpoint.PR,
      label: 'Simulate PR webhook',
    },
  ],
  virtualSubscribes: [],
  flows: ['github-pr-management'],
}
