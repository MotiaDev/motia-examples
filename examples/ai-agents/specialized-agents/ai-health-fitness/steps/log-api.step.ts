import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'log-activity-api',
  path: '/log',
  method: 'POST',
  emits: ['user-activity-log'],
  bodySchema: z.object({
    user: z.string(),
    weight: z.string().optional(),
    workout: z.string().optional(),
    meal: z.string().optional()
  }),
  description: 'HTTP endpoint to log user health activity'
}

export const handler: Handlers['log-activity-api'] = async (req, { emit, logger }) => {
  await emit({
    topic: 'user-activity-log',
    data: req.body
  })

  logger.info('Health data emitted for logging')
  return {
    status: 200,
    body: { message: 'Data received and emitted' }
  }
}
