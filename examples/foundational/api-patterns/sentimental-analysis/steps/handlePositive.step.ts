// Handles "openai.positiveSentiment"
import { Handlers } from 'motia'
import { z } from 'zod'
 
export const config = {
  type: 'event',
  name: 'handlePositive',
  description: 'Handles positive sentiment responses.',
  subscribes: ['openai.positiveSentiment'],
  emits: [],
  input: z.object({
    sentiment: z.string(),
    analysis: z.string().optional(),
  }),
  flows: ['sentiment-demo'],
} as const
 
export const handler: Handlers['handlePositive'] = async (input, { logger }) => {
  logger.info('[Positive Responder] The sentiment is positive!', { analysis: input.analysis })
  // Maybe notify a Slack channel: "All good vibes here!"
}