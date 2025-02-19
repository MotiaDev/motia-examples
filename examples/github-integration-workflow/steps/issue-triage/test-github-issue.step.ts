import { NoopConfig } from '@motiadev/core'
import React from 'react'
import { BaseHandle, Position } from '@motiadev/workbench'
import { GithubWebhookEndpoint } from '../../types/github-events'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Test GitHub Issue',
  description: 'Simulates GitHub issue events for testing',
  virtualEmits: [{
    type: GithubWebhookEndpoint.Issue,
    label: 'Simulate GitHub webhook'
  }],
  virtualSubscribes: [],
  flows: ['github-issue-management'],
}
