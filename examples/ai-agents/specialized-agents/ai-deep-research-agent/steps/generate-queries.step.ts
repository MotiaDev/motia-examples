import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { OpenAIService } from '../services/openai.service'
import { ResearchConfig } from './types/research-config'

type Input = typeof inputSchema

const inputSchema = z.object({
  query: z.string(),
  breadth: z.number().int(),
  depth: z.number().int(),
  requestId: z.string()
})

export const config: EventConfig = {
  type: 'event',
  name: 'Generate Search Queries',
  description: 'Generate search queries based on the research topic',
  subscribes: ['research-started'],
  emits: [{
    topic: 'search-queries-generated',
    label: 'Search queries generated',
  }],
  input: inputSchema,
  flows: ['research'],
}

export const handler: Handlers['Generate Search Queries'] = async (input, { traceId, logger, state, emit }) => {
  logger.info('Generating search queries for research topic', input)

  try {
    // Use the OpenAI service to generate search queries
    const openAIService = new OpenAIService()
    const searchQueries = await openAIService.generateSearchQueries(input.query, input.breadth)

    logger.info('Generated search queries', { searchQueries })

    // Store the search queries in state
    await state.set(traceId, 'searchQueries', searchQueries)
    await state.set(traceId, 'originalQuery', input.query)
    await state.set<ResearchConfig>(traceId, 'researchConfig', { 
      breadth: input.breadth,
      depth: input.depth,
      currentDepth: 0
    })

    // Emit event with the generated queries
    await emit({
      topic: 'search-queries-generated',
      data: {
        searchQueries,
        requestId: input.requestId,
        originalQuery: input.query,
        depth: 0,
      }
    })
  } catch (error) {
    logger.error('Error generating search queries', { error })
    throw error
  }
} 