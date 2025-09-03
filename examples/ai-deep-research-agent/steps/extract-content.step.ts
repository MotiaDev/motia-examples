import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { FirecrawlService } from '../services/firecrawl.service'

type Input = typeof inputSchema

const inputSchema = z.object({
  searchResults: z.array(
    z.object({
      query: z.string(),
      results: z.array(
        z.object({
          url: z.string(),
          title: z.string(),
          snippet: z.string()
        })
      )
    })
  ),
  requestId: z.string(),
  originalQuery: z.string(),
  depth: z.number().int()
})

export const config: EventConfig = {
  type: 'event',
  name: 'Extract Web Content',
  description: 'Extract content from web pages using Firecrawl',
  subscribes: ['search-results-collected'],
  emits: [{
    topic: 'content-extracted',
    label: 'Content extracted',
  }],
  input: inputSchema,
  flows: ['research', 'ollama-research'],
}

export const handler: Handlers['Extract Web Content'] = async (input, { traceId, logger, state, emit }) => {
  logger.info('Extracting content from web pages', {
    numberOfQueries: input.searchResults.length,
    depth: input.depth
  })

  try {
    const firecrawlService = new FirecrawlService()
    
    // Flatten the search results to get all URLs
    const urlsToExtract = input.searchResults.flatMap(sr => 
      sr.results.map(result => ({
        url: result.url,
        title: result.title,
        query: sr.query
      }))
    )

    // Extract content from all URLs using the service
    const extractedContents = await firecrawlService.batchExtractContent(
      urlsToExtract,
      logger
    )
    
    // Store the extracted content in state
    await state.set(traceId, `extractedContent-depth-${input.depth}`, extractedContents)
    
    // Emit event with the extracted content
    await emit({
      topic: 'content-extracted',
      data: {
        extractedContents,
        requestId: input.requestId,
        originalQuery: input.originalQuery,
        depth: input.depth
      }
    })
  } catch (error) {
    logger.error('Failed to extract content', { error: error.message })
    throw error
  }
} 