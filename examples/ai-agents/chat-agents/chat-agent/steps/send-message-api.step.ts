import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'SendMessageApi',
  description: 'Send a new chat message',
  method: 'POST',
  path: '/send-message',
  emits: ['new-message'],
  bodySchema: z.object({ 
    message: z.string().min(1, 'Message content is required'),
    username: z.string().min(1, 'Username is required'),
    roomId: z.string().optional().default('general')
  }),
  responseSchema: {
    200: z.object({ 
      success: z.boolean(),
      messageId: z.string(),
      timestamp: z.string(),
      message: z.object({
        id: z.string(),
        content: z.string(),
        username: z.string(),
        roomId: z.string(),
        timestamp: z.string()
      })
    })
  },
  flows: ['chat'],
}

export const handler: Handlers['SendMessageApi'] = async (req, { traceId, logger, emit, streams, state }) => {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const timestamp = new Date().toISOString()
  const roomId = req.body.roomId ?? 'general'
  
  logger.info('New chat message received', { 
    messageId, 
    username: req.body.username,
    roomId 
  })

  // Initialize chat state if it doesn't exist
  const chatStateKey = `chat-${roomId}`
  const existingChat = await state.get(traceId, chatStateKey)
  if (!existingChat) {
    const initialChatState = {
      roomId,
      messages: [],
      totalMessages: 0,
      lastActivity: timestamp
    }
    await state.set(traceId, chatStateKey, initialChatState)
    
    try {
      await streams.chatMessages.set(roomId, 'room-state', initialChatState)
    } catch (error) {
      logger.warn('Stream not available, continuing without real-time updates', { error })
    }
  }

  await emit({
    topic: 'new-message',
    data: { 
      messageId,
      message: req.body.message,
      username: req.body.username,
      roomId,
      timestamp
    },
  })

  return {
    status: 200,
    body: { 
      success: true,
      messageId,
      timestamp,
      message: {
        id: messageId,
        content: req.body.message,
        username: req.body.username,
        roomId,
        timestamp
      }
    },
  }
}
