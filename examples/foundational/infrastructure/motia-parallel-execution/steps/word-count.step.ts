import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'WordCountProcessor',
  description: 'Count words in parallel',
  subscribes: ['parallel-processing'],
  emits: ['processing-result'],
  input: z.object({ 
    text: z.string(),
    processingId: z.string()
  }),
  flows: ['parallel-processing'],
}

export const handler: Handlers['WordCountProcessor'] = async (input, { traceId, logger, emit, streams }) => {
  logger.info('Step 05 – Processing word count', { processingId: input.processingId })

  await new Promise(resolve => setTimeout(resolve, 1000))

  const wordCount = input.text.split(/\s+/).filter(word => word.length > 0).length

  await emit({
    topic: 'processing-result',
    data: {
      type: 'wordCount',
      result: wordCount,
      processingId: input.processingId
    }
  })

  logger.info('Step 05 – Word count completed', { wordCount, processingId: input.processingId })
}
