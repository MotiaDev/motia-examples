import { ApiRouteConfig, StepHandler } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'default flow api trigger',
  description: 'default template api trigger',
  path: '/kickstart',
  virtualSubscribes: ['/kickstart'],
  method: 'POST',
  emits: ['fetch-mentions'],
  bodySchema: inputSchema,
  flows: ['keywords'],
}

export const handler: StepHandler<typeof config> = async (req, { logger, emit }) => {
  logger.info('processing default flow api step', req)

  await emit({
    topic: 'fetch-mentions',
    data: {},
  })

  return {
    status: 200,
    body: { message: 'fetch-mentions topic emitted' },
  }
}
