import { z } from 'zod'
import { GithubIssueEvent, GithubWebhookEndpoint } from '../../types/github-events'
import type { ApiRouteConfig, StepHandler } from 'motia'

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
  flows: ['github-issue-management'],
}

export const handler: StepHandler<typeof config> = async (req, { emit, logger }) => {
  const { action, issue, repository } = req.body

  logger.info('[GitHub Webhook] Received webhook', {
    action,
    issueNumber: issue.number,
  })

  await emit({
    topic: `github.issue.${action}` as GithubIssueEvent,
    data: {
      issueNumber: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      labels: issue.labels.map((l: { name: string }) => l.name),
      owner: repository.owner.login,
      repo: repository.name,
    },
  })

  return {
    status: 200,
    body: { message: 'Webhook processed successfully' },
  }
}
