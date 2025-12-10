import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { notionService } from '../src/services/notion'

const inputSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  userMessage: z.string(),
  assistantMessage: z.string(),
  timestamp: z.string()
})

export const config: EventConfig = {
  type: 'event',
  name: 'SaveConversation',
  description: 'Saves conversation messages to Notion database',
  subscribes: ['save-conversation'],
  emits: [],
  input: inputSchema,
  flows: ['guest-assistant']
}

export const handler: Handlers['SaveConversation'] = async (input, { logger }) => {
  try {
    // Save user message
    await notionService.saveConversation({
      sessionId: input.sessionId,
      userId: input.userId,
      role: 'user',
      content: input.userMessage,
      timestamp: input.timestamp
    })
    
    // Save assistant message
    await notionService.saveConversation({
      sessionId: input.sessionId,
      userId: input.userId,
      role: 'assistant',
      content: input.assistantMessage,
      timestamp: new Date().toISOString()
    })
    
    logger.info('Conversation saved to Notion', { sessionId: input.sessionId })
  } catch (error) {
    logger.error('Failed to save conversation', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: input.sessionId
    })
  }
}
