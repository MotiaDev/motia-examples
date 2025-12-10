import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'intent-router',
  path: '/intent',
  method: 'POST',
  emits: ['message-received'],
  bodySchema: z.object({
    user: z.string(),
    message: z.string()
  }),
  description: 'Receives user message from WhatsApp and emits for intent classification'
}

export const handler: Handlers['intent-router'] = async (req, { emit, logger }) => {
  const { user, message } = req.body

  logger.info(`Received message for intent routing: ${message}`)

  await emit({
    topic: 'message-received',
    data: { user, message }
  })

  return {
    status: 200,
    body: { message: 'Intent routing started' }
  }
}
