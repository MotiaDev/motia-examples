import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'MessageModerator',
  description: 'Moderate chat messages for content policy',
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

export const handler: Handlers['MessageModerator'] = async (input, { traceId, logger, emit }) => {
  logger.info('Moderating message content', { messageId: input.messageId })

  await new Promise(resolve => setTimeout(resolve, 300))

  const flaggedPatterns = [
    /\b(spam|scam|phishing)\b/i,
    /\b(offensive|toxic|harassment)\b/i,
    /https?:\/\/[^\s]+/g
  ]

  const flags: string[] = []
  let moderatedMessage = input.message

  for (const pattern of flaggedPatterns) {
    if (pattern.test(input.message)) {
      if (pattern.source.includes('https')) {
        flags.push('contains_links')
        moderatedMessage = moderatedMessage.replace(pattern, '[LINK_REMOVED]')
      } else {
        flags.push('inappropriate_content')
      }
    }
  }

  const isModerated = flags.length > 0
  const shouldBlock = flags.includes('inappropriate_content')

  await emit({
    topic: 'processed-message',
    data: {
      type: 'moderation',
      messageId: input.messageId,
      message: input.message,
      username: input.username,
      roomId: input.roomId,
      timestamp: input.timestamp,
      result: {
        isModerated,
        shouldBlock,
        flags,
        moderatedMessage: isModerated ? moderatedMessage : input.message
      }
    }
  })

  logger.info('Message moderation completed', { 
    messageId: input.messageId, 
    isModerated,
    flags 
  })
}
