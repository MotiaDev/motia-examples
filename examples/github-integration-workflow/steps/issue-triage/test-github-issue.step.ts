import { GithubWebhookEndpoint } from '../../types/github-events'
import type { NoopConfig } from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Test GitHub Issue',
  description: 'Simulates GitHub issue events for testing',
  virtualEmits: [
    {
      topic: GithubWebhookEndpoint.Issue,
      label: 'Simulate GitHub webhook',
    },
  ],
  virtualSubscribes: [],
  flows: ['github-issue-management'],
}
