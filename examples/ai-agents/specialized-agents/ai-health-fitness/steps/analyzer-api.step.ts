import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'analyzer-api',
  path: '/analyze',
  method: 'POST',
  emits: ['analyze-user-habits'],
  bodySchema: z.object({
    user: z.string()
  }),
  description: 'Trigger analysis of users health habits'
}

export const handler: Handlers['analyzer-api'] = async (req, { emit, logger }) => {
  const { user } = req.body
  logger.info(`Requesting habit analysis for user: ${user}`)

  await emit({
    topic: 'analyze-user-habits',
    data: { user }
  })

  return {
    status: 200,
    body: {
      message: 'Habit analysis requested.',
      status: 'queued'
    }
  }
}
