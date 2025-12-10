import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'MessageValidator',
  description: 'Validate and filter chat messages',
  subscribes: ['new-message'],
  emits: ['processed-message'],
  input: z.object({ 
    messageId: z.string(),
    message: z.string(),
    username: z.string(),
    roomId: z.string(),
    timestamp: z.string()
  }),
  flows: ['chat'],
}

export const handler: Handlers['MessageValidator'] = async (input, { traceId, logger, emit }) => {
  logger.info('Validating message', { messageId: input.messageId })

  await new Promise(resolve => setTimeout(resolve, 200))

  const bannedWords = ['spam', 'abuse', 'inappropriate']
  const containsBannedWords = bannedWords.some(word => 
    input.message.toLowerCase().includes(word)
  )

  const isValid = !containsBannedWords && input.message.trim().length > 0

  await emit({
    topic: 'processed-message',
    data: {
      type: 'validation',
      messageId: input.messageId,
      message: input.message,
      username: input.username,
      roomId: input.roomId,
      timestamp: input.timestamp,
      result: {
        isValid,
        reason: containsBannedWords ? 'Contains banned words' : 'Valid message'
      }
    }
  })

  logger.info('Message validation completed', { 
    messageId: input.messageId, 
    isValid 
  })
}
