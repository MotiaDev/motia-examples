import { z } from 'zod'
import { GithubPREvent, GithubWebhookEndpoint } from '../../types/github-events'
import type { ApiRouteConfig, Handlers } from 'motia'

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
      }).optional(),
    }),
    head: z.object({
      ref: z.string(),
      sha: z.string(),
    }),
    merged: z.boolean().optional(),
  }),
  repository: z.object({
    owner: z.object({ login: z.string() }),
    name: z.string(),
  }).optional(),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'PR Webhook Handler',
  description: 'Handles incoming PR webhook events from GitHub',
  path: GithubWebhookEndpoint.PR,
  virtualSubscribes: [GithubWebhookEndpoint.PR],
  method: 'POST',
  emits: [
    {
      topic: GithubPREvent.Opened,
      label: 'New PR created',
    },
    {
      topic: GithubPREvent.Edited,
      label: 'PR content updated',
    },
    {
      topic: GithubPREvent.Closed,
      label: 'PR closed',
    },
    {
      topic: GithubPREvent.Merged,
      label: 'PR merged successfully',
    },
  ],
  bodySchema: webhookSchema,
  responseSchema: {
    200: z.object({
      message: z.string(),
    }),
  },
  flows: ['github-pr-management'],
}

export const handler: Handlers['PR Webhook Handler'] = async (req, { emit, logger }) => {
  const { action, pull_request: pr, repository } = req.body

  logger.info('[PR Webhook] Received webhook', { action, prNumber: pr.number })

  const baseEventData = {
    prNumber: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    labels: pr.labels ? pr.labels.map((l: { name: string }) => l.name) : [],
    author: pr.user.login,
    owner: (pr.base.repo?.owner?.login) || repository?.owner.login || '',
    repo: (pr.base.repo?.name) || repository?.name || '',
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    commitSha: pr.head.sha,
  }

  // Handle different webhook actions
  if (action === 'opened' || action === 'edited') {
    await emit({
      topic: `github.pr.${action}`,
      data: baseEventData,
    })
  } else if (action === 'closed') {
    if (pr.merged) {
      await emit({
        topic: GithubPREvent.Merged,
        data: baseEventData,
      })
    } else {
      await emit({
        topic: GithubPREvent.Closed,
        data: baseEventData,
      })
    }
  } else {
    logger.warn('[PR Webhook] Unsupported action', { action })
    // Don't emit any event for unsupported actions
  }

  return {
    status: 200,
    body: { message: 'Webhook processed successfully' },
  }
}
