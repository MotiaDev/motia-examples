import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'DataAggregator',
  description: 'Aggregate results from parallel processing',
  subscribes: ['processing-result'],
  emits: [],
  input: z.object({
    type: z.enum(['wordCount', 'sentiment', 'keywords']),
    result: z.union([z.number(), z.string(), z.array(z.string())]),
    processingId: z.string()
  }),
  flows: ['parallel-processing'],
}

export const handler: Handlers['DataAggregator'] = async (input, { traceId, logger, state, streams }) => {
  logger.info('Step 08 – Aggregating processing result', { input })

  const { type, result, processingId } = input

  const currentResults = await state.get(traceId, `results-${processingId}`) as Record<string, any> || {}
  
  currentResults[type] = result
  await state.set(traceId, `results-${processingId}`, currentResults)

  const expectedResults = ['wordCount', 'sentiment', 'keywords']
  const completedResults = Object.keys(currentResults)
  const isComplete = expectedResults.every(key => completedResults.includes(key))

  const progress = Math.round((completedResults.length / expectedResults.length) * 100)
  
  if (isComplete) {
    const keywordsStr = Array.isArray(currentResults.keywords) 
   ? currentResults.keywords.join(', ') 
   : String(currentResults.keywords)
 const summary = `Text analysis complete: ${currentResults.wordCount} words, ${currentResults.sentiment} sentiment, top keywords: ${keywordsStr}`
    
    currentResults.summary = summary

    await streams.processingProgress.set(traceId, processingId, {
      status: 'completed',
      progress: 100,
      results: currentResults
    })

    logger.info('Step 08 – All parallel processing completed', { 
      processingId, 
      finalResults: currentResults 
    })
  } else {
    await streams.processingProgress.set(traceId, processingId, {
      status: 'processing',
      progress,
      results: currentResults
    })

    logger.info('Step 08 – Partial results aggregated', { 
      processingId, 
      progress,
      completedResults: completedResults 
    })
  }
}
