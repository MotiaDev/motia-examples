// Receives user text, emits "openai.analyzeSentimentRequest".
import { Handlers } from 'motia'
import { z } from 'zod'
 
export const config = {
  type: 'api',
  name: 'analyzeSentimentApi',
  description: 'Receives user text and emits an event to trigger sentiment analysis.',
  path: '/api/analyze-sentiment',
  method: 'POST',
  emits: ['openai.analyzeSentimentRequest'],
  bodySchema: z.object({
    text: z.string().min(1, 'text is required'),
  }),
  flows: ['sentiment-demo'],
} as const
 
export const handler: Handlers['analyzeSentimentApi'] = async (req, { emit, logger }) => {
  const { text } = req.body
 
  logger.info('[AnalyzeSentimentAPI] Received text', { text })
 
  // Emit an event to call OpenAI
  await emit({
    topic: 'openai.analyzeSentimentRequest',
    data: { text },
  })
 
  // Return right away
  return {
    status: 200,
    body: { status: 'Accepted', message: 'Your text is being analyzed' },
  }
}