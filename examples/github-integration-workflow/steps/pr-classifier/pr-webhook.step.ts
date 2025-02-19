import { ApiRouteConfig, StepHandler } from '@motiadev/core'
import { z } from 'zod'
import { GithubPREvent, GithubWebhookEndpoint } from '../../types/github-events'

const webhookSchema = z.object({
  action: z.string(),
  pull_request: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().optional(),
    state: z.string(),
    labels: z.array(z.object({ name: z.string() })),
    user: z.object({ login: z.string() }),
    base: z.object({
      ref: z.string(),
      repo: z.object({
        name: z.string(),
        owner: z.object({ login: z.string() }),
      }),
    }),
    head: z.object({
      ref: z.string(),
      sha: z.string(),
    }),
  }),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'PR Webhook Handler',
  description: 'Handles incoming PR webhook events from GitHub',
  path: GithubWebhookEndpoint.PR,
  virtualSubscribes: [GithubWebhookEndpoint.PR],
  method: 'POST',
  emits: [{
    type: GithubPREvent.Opened,
    label: 'New PR created'
  }, {
    type: GithubPREvent.Edited,
    label: 'PR content updated'
  }, {
    type: GithubPREvent.Closed,
    label: 'PR closed'
  }, {
    type: GithubPREvent.Merged,
    label: 'PR merged successfully'
  }],
  bodySchema: webhookSchema,
  flows: ['github-pr-management'],
}

export const handler: StepHandler<typeof config> = async (req, { emit, logger }) => {
  const { action, pull_request: pr } = req.body

  logger.info('[PR Webhook] Received webhook', { action, prNumber: pr.number })

  const baseEventData = {
    prNumber: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    labels: pr.labels.map((l: { name: string }) => l.name),
    author: pr.user.login,
    owner: pr.base.repo.owner.login,
    repo: pr.base.repo.name,
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    commitSha: pr.head.sha,
  }

  if (action === 'closed' && pr.merged) {
    await emit({
      type: GithubPREvent.Merged,
      data: baseEventData,
    })
  } else {
    await emit({
      type: `github.pr.${action}`,
      data: baseEventData,
    })
  }

  return {
    status: 200,
    body: { message: 'PR webhook processed successfully' },
  }
} 