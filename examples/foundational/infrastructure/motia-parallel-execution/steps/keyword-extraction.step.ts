import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'KeywordExtractor',
  description: 'Extract keywords in parallel',
  subscribes: ['parallel-processing'],
  emits: ['processing-result'],
  input: z.object({ 
    text: z.string(),
    processingId: z.string()
  }),
  flows: ['parallel-processing'],
}

export const handler: Handlers['KeywordExtractor'] = async (input, { traceId, logger, emit, streams }) => {
  logger.info('Step 07 – Processing keyword extraction', { processingId: input.processingId })

  await new Promise(resolve => setTimeout(resolve, 800))

  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']
  
  const words = input.text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word: string) => word.length > 3 && !stopWords.includes(word))
  
  const wordFreq = words.reduce((acc: Record<string, number>, word: string) => {
    acc[word] = (acc[word] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const keywords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([word]) => word)

  await emit({
    topic: 'processing-result',
    data: {
      type: 'keywords',
      result: keywords,
      processingId: input.processingId
    }
  })

  logger.info('Step 07 – Keyword extraction completed', { keywords, processingId: input.processingId })
}
