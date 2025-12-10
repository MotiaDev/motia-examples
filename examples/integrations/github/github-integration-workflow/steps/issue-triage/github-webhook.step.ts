import { z } from 'zod'
import { GithubIssueEvent, GithubWebhookEndpoint } from '../../types/github-events'
import type { ApiRouteConfig, Handlers } from 'motia'

const webhookSchema = z.object({
  action: z.string(),
  issue: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().optional(),
    state: z.string(),
    labels: z.array(z.object({ name: z.string() })),
  }),
  repository: z.object({
    owner: z.object({ login: z.string() }),
    name: z.string(),
  }),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GitHub Webhook Handler',
  path: GithubWebhookEndpoint.Issue,
  virtualSubscribes: [GithubWebhookEndpoint.Issue],
  method: 'POST',
  emits: [
    {
      topic: GithubIssueEvent.Opened,
      label: 'New issue created',
    },
    {
      topic: GithubIssueEvent.Edited,
      label: 'Issue content updated',
    },
    {
      topic: GithubIssueEvent.Closed,
      label: 'Issue marked as closed',
    },
  ],
  bodySchema: webhookSchema,
  responseSchema: {
    200: z.object({
      message: z.string(),
    }),
  },
  flows: ['github-issue-management'],
}

export const handler: Handlers['GitHub Webhook Handler'] = async (req, { emit, logger }) => {
  const { action, issue, repository } = req.body

  logger.info('[GitHub Webhook] Received webhook', {
    action,
    issueNumber: issue.number,
  })

  const data = {
    issueNumber: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    labels: issue.labels.map((l: { name: string }) => l.name),
    owner: repository.owner.login,
    repo: repository.name,
  }

  if (action === 'opened') {
    await emit({ topic: GithubIssueEvent.Opened, data })
  } else if (action === 'edited') {
    await emit({ topic: GithubIssueEvent.Edited, data })
  } else {
    await emit({ topic: GithubIssueEvent.Closed, data })
  }

  return {
    status: 200,
    body: { message: 'Webhook processed successfully' },
  }
}
