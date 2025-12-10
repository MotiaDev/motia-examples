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
  description: 'Entry point for WhatsApp messages'
}

export const handler: Handlers['intent-router'] = async (req, { emit }) => {
  await emit({
    topic: 'message-received',
    data: req.body
  })

  return {
    status: 200,
    body: { message: 'Intent routing started' }
  }
}
