import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'MessageSentiment',
  description: 'Analyze sentiment of chat messages',
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

export const handler: Handlers['MessageSentiment'] = async (input, { traceId, logger, emit }) => {
  logger.info('Analyzing message sentiment', { messageId: input.messageId })

  await new Promise(resolve => setTimeout(resolve, 500))

  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'awesome']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'horrible', 'worst', 'angry', 'sad', 'disappointed']
  
  const text = input.message.toLowerCase()
  const positiveCount = positiveWords.filter(word => text.includes(word)).length
  const negativeCount = negativeWords.filter(word => text.includes(word)).length
  
  let sentiment = 'neutral'
  if (positiveCount > negativeCount) sentiment = 'positive'
  else if (negativeCount > positiveCount) sentiment = 'negative'

  await emit({
    topic: 'processed-message',
    data: {
      type: 'sentiment',
      messageId: input.messageId,
      message: input.message,
      username: input.username,
      roomId: input.roomId,
      timestamp: input.timestamp,
      result: {
        sentiment,
        positiveScore: positiveCount,
        negativeScore: negativeCount
      }
    }
  })

  logger.info('Message sentiment analysis completed', { 
    messageId: input.messageId, 
    sentiment 
  })
}
