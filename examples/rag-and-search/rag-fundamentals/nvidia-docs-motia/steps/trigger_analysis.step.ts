import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'repo-analyzer-api',
  path: '/analyze-repo',
  method: 'POST',
  emits: ['repo.requested'],
  bodySchema: z.object({
    repo_url: z.string().url('Must be a valid URL')
  }),
  description: 'Trigger repository analysis via API endpoint'
}

export const handler: Handlers['repo-analyzer-api'] = async (req, { emit, logger }) => {
  const { repo_url } = req.body
  logger.info(`Requesting repository analysis for: ${repo_url}`)

  await emit({
    topic: 'repo.requested',
    data: { repo_url }
  })

  return {
    status: 200,
    body: {
      message: 'Repository analysis requested successfully',
      repo_url,
      status: 'queued'
    }
  }
}