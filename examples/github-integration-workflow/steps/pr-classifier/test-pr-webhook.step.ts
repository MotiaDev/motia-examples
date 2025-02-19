import { NoopConfig } from '@motiadev/core'
import { GithubWebhookEndpoint } from '../../types/github-events'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Test PR Webhook',
  description: 'Simulates GitHub PR webhook events for testing',
  virtualEmits: [{
    type: GithubWebhookEndpoint.PR,
    label: 'Simulate PR webhook'
  }],
  virtualSubscribes: [],
  flows: ['github-pr-management'],
} 