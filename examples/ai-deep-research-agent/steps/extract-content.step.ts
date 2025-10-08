import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { FirecrawlService } from '../services/firecrawl.service'

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

type Input = z.infer<typeof inputSchema>

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
  flows: ['research'],
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
    
    // Truncate content to avoid SNS message size limits (256KB)
    // Each content limited to 10,000 characters to stay well under SNS limits
    const MAX_CONTENT_LENGTH = 10000
    const truncatedContents = extractedContents.map(content => ({
      ...content,
      content: content.content.length > MAX_CONTENT_LENGTH 
        ? content.content.slice(0, MAX_CONTENT_LENGTH) + '\n... (content truncated)'
        : content.content
    }))
    
    logger.info('Content extracted and truncated', {
      originalCount: extractedContents.length,
      truncatedCount: truncatedContents.length,
      totalSize: JSON.stringify(truncatedContents).length
    })
    
    // Store the full extracted content in state (no size limits)
    await state.set(traceId, `extractedContent-depth-${input.depth}`, extractedContents)
    
    // Emit event with truncated content (for SNS compatibility)
    await emit({
      topic: 'content-extracted',
      data: {
        extractedContents: truncatedContents,
        requestId: input.requestId,
        originalQuery: input.originalQuery,
        depth: input.depth
      }
    })
  } catch (error) {
    logger.error('Failed to extract content', { error: error instanceof Error ? error.message : 'Unknown error' })
    throw error
  }
} 