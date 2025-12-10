import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'health-chat-api',
  path: '/chat',
  method: 'POST',
  emits: ['health-chat-message'],
  bodySchema: z.object({
    message: z.string(),
    conversationId: z.string().optional()
  }),
  description: 'Start a conversation with AI health coach',
}

export const handler: Handlers['health-chat-api'] = async (req, { emit, logger }) => {
  const { message, conversationId } = req.body

  logger.info('Received user message:', message)

  const assistantMessageId = crypto.randomUUID()
  const convId = conversationId || crypto.randomUUID()

  await emit({
    topic: 'health-chat-message',
    data: { message, conversationId: convId, assistantMessageId }
  })

  return {
    status: 200,
    body: {
      conversationId: convId,
      status: 'streaming'
    }
  }
}