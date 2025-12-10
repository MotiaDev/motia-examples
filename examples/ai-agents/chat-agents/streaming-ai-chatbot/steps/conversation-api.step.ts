import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ConversationApi',
  description: 'Get conversation messages',
  path: '/api/conversations/:conversationId',
  method: 'GET',
  emits: [], // Required field - no events emitted for GET endpoint
  responseSchema: {
    200: z.object({
      messages: z.record(z.object({
        message: z.string(),
        from: z.enum(['user', 'assistant']),
        status: z.enum(['created', 'streaming', 'completed']),
        timestamp: z.string(),
      }))
    }),
    404: z.object({
      error: z.string()
    })
  },
  flows: ['chat'],
}

export const handler: Handlers['ConversationApi'] = async (req, { logger, streams }) => {
  const { conversationId } = req.pathParams
  
  logger.info('Fetching conversation messages', { conversationId })

  try {
    // Get messages for this specific conversation using conversationId as groupId
    const conversationMessages = await streams.conversation.getGroup(conversationId)
    
    logger.info('Retrieved conversation messages', { 
      conversationId, 
      messageCount: Object.keys(conversationMessages).length,
      messageIds: Object.keys(conversationMessages)
    })
    
    return {
      status: 200,
      body: { messages: conversationMessages }
    }
  } catch (error) {
    logger.error('Failed to fetch conversation messages', { 
      error: error.message, 
      conversationId 
    })
    
    return {
      status: 404,
      body: { error: 'Conversation not found' }
    }
  }
}
