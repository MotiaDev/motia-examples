import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { FirecrawlService } from '../services/firecrawl.service'

type Input = typeof inputSchema

const inputSchema = z.object({
  searchQueries: z.array(z.string()),
  requestId: z.string(),
  originalQuery: z.string(),
  depth: z.number().int()
})

export const config: EventConfig = {
  type: 'event',
  name: 'Web Search',
  description: 'Perform web searches using Firecrawl',
  subscribes: ['search-queries-generated'],
  emits: [{
    topic: 'search-results-collected',
    label: 'Search results collected',
  }],
  input: inputSchema,
  flows: ['research'],
}

export const handler: Handlers['Web Search'] = async (input, { traceId, logger, state, emit }) => {
  logger.info('Performing web searches', { 
    numberOfQueries: input.searchQueries.length,
    depth: input.depth 
  })

  const firecrawlService = new FirecrawlService()
  const searchResults = []
  
  // Process each search query sequentially to avoid rate limiting
  for (const query of input.searchQueries) {
    logger.info('Executing search query', { query })
    
    try {
      // Use the FirecrawlService to perform the search
      const results = await firecrawlService.search({ query }, logger)
      
      // Add the search results to our collection
      searchResults.push({
        query,
        results
      })
    } catch (error) {
      logger.error('Error during web search', { query, error })
      // Continue with other queries even if one fails
    }
  }

  // Store the search results in state
  await state.set(traceId, `searchResults-depth-${input.depth}`, searchResults)
  
  // Emit event with the collected search results
  await emit({
    topic: 'search-results-collected',
    data: {
      searchResults,
      requestId: input.requestId,
      originalQuery: input.originalQuery,
      depth: input.depth
    }
  })
} 