import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'SentimentAnalyzer',
  description: 'Analyze sentiment in parallel',
  subscribes: ['parallel-processing'],
  emits: ['processing-result'],
  input: z.object({ 
    text: z.string(),
    processingId: z.string()
  }),
  flows: ['parallel-processing'],
}

export const handler: Handlers['SentimentAnalyzer'] = async (input, { traceId, logger, emit, streams }) => {
  logger.info('Step 06 – Processing sentiment analysis', { processingId: input.processingId })

  await new Promise(resolve => setTimeout(resolve, 1500))

  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'horrible', 'worst']
  
  const text = input.text.toLowerCase()
  const positiveCount = positiveWords.filter(word => text.includes(word)).length
  const negativeCount = negativeWords.filter(word => text.includes(word)).length
  
  let sentiment = 'neutral'
  if (positiveCount > negativeCount) sentiment = 'positive'
  else if (negativeCount > positiveCount) sentiment = 'negative'

  await emit({
    topic: 'processing-result',
    data: {
      type: 'sentiment',
      result: sentiment,
      processingId: input.processingId
    }
  })

  logger.info('Step 06 – Sentiment analysis completed', { sentiment, processingId: input.processingId })
}
