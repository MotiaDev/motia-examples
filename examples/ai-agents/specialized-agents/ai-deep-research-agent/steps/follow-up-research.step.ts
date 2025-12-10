import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

type Input = typeof inputSchema

const inputSchema = z.object({
  followUpQueries: z.array(z.string()),
  requestId: z.string(),
  originalQuery: z.string(),
  depth: z.number().int(),
  previousAnalysis: z.object({
    summary: z.string(),
    keyFindings: z.array(z.string()),
    sources: z.array(z.object({
      title: z.string(),
      url: z.string()
    }))
  })
})

export const config: EventConfig = {
  type: 'event',
  name: 'Follow-up Research',
  description: 'Process follow-up research queries for deeper investigation',
  subscribes: ['follow-up-research-needed'],
  emits: [{
    topic: 'search-queries-generated',
    label: 'Search queries generated',
  }],
  input: inputSchema,
  flows: ['research'],
}

export const handler: Handlers['Follow-up Research'] = async (input, { traceId, logger, state, emit }) => {
  logger.info('Processing follow-up research queries', {
    queriesCount: input.followUpQueries.length,
    depth: input.depth
  })

  try {
    // Store the follow-up queries in state
    await state.set(traceId, `followUpQueries-depth-${input.depth}`, input.followUpQueries)
    
    // Pass the follow-up queries directly to the search step
    await emit({
      topic: 'search-queries-generated',
      data: {
        searchQueries: input.followUpQueries,
        requestId: input.requestId,
        originalQuery: input.originalQuery,
        depth: input.depth
      }
    })
    
  } catch (error) {
    logger.error('Error processing follow-up research', { error })
    throw error
  }
} 