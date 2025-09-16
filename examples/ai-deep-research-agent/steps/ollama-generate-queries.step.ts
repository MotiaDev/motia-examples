import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { OllamaService } from '../services/ollama.service'
import { ResearchConfig } from './types/research-config'

type Input = typeof inputSchema

const inputSchema = z.object({
  query: z.string(),
  breadth: z.number().int(),
  depth: z.number().int(),
  requestId: z.string(),
  ollamaHost: z.string().optional(),
  ollamaModel: z.string().optional(),
  provider: z.string()
})

export const config: EventConfig = {
  type: 'event',
  name: 'Ollama Generate Search Queries',
  description: 'Generate search queries using Ollama LLM based on the research topic',
  subscribes: ['ollama-research-started'],
  emits: [{
    topic: 'ollama-search-queries-generated',
    label: 'Search queries generated',
  }],
  input: inputSchema,
  flows: ['ollama-research'],
}

export const handler: Handlers['Ollama Generate Search Queries'] = async (input, { traceId, logger, state, emit }) => {
  logger.info('Generating search queries using Ollama for research topic', {
    query: input.query,
    breadth: input.breadth,
    ollamaHost: input.ollamaHost,
    ollamaModel: input.ollamaModel
  })

  try {
    // Use the Ollama service to generate search queries
    const ollamaService = new OllamaService(input.ollamaHost)
    const searchQueries = await ollamaService.generateSearchQueries(input.query, input.breadth)

    logger.info('Generated search queries using Ollama', { 
      searchQueries,
      model: input.ollamaModel || process.env.OLLAMA_MODEL || 'llama3.1'
    })

    // Store the search queries and configuration in state
    await state.set(traceId, 'searchQueries', searchQueries)
    await state.set(traceId, 'originalQuery', input.query)
    await state.set(traceId, 'provider', 'ollama')
    await state.set(traceId, 'ollamaConfig', {
      host: input.ollamaHost,
      model: input.ollamaModel
    })
    await state.set<ResearchConfig>(traceId, 'researchConfig', { 
      breadth: input.breadth,
      depth: input.depth,
      currentDepth: 0
    })

    // Emit event with the generated queries
    await emit({
      topic: 'ollama-search-queries-generated',
      data: {
        searchQueries,
        requestId: input.requestId,
        originalQuery: input.query,
        depth: 0,
        provider: 'ollama'
      }
    })
  } catch (error) {
    logger.error('Error generating search queries with Ollama', { error })
    throw error
  }
}
