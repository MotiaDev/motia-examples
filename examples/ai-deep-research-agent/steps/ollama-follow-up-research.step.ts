import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

type Input = typeof inputSchema

const inputSchema = z.object({
  followUpQueries: z.array(z.string()),
  requestId: z.string(),
  originalQuery: z.string(),
  depth: z.number().int(),
  provider: z.string().optional(),
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
  name: 'Ollama Follow-up Research',
  description: 'Process follow-up research queries for deeper investigation using Ollama',
  subscribes: ['follow-up-research-needed'],
  emits: [{
    topic: 'search-queries-generated',
    label: 'Search queries generated',
  }],
  input: inputSchema,
  flows: ['ollama-research'],
}

export const handler: Handlers['Ollama Follow-up Research'] = async (input, { traceId, logger, state, emit }) => {
  // Check if this event is for Ollama flow
  const provider = await state.get<string>(traceId, 'provider');
  if (provider !== 'ollama') {
    logger.info('Skipping Ollama follow-up research - not an Ollama research flow');
    return;
  }

  logger.info('Processing follow-up research queries using Ollama', {
    queriesCount: input.followUpQueries.length,
    depth: input.depth,
    provider: 'ollama'
  })

  try {
    // Store the follow-up queries in state
    await state.set(traceId, `followUpQueries-depth-${input.depth}`, input.followUpQueries)
    
    // Pass the follow-up queries directly to the search step with provider information
    await emit({
      topic: 'search-queries-generated',
      data: {
        searchQueries: input.followUpQueries,
        requestId: input.requestId,
        originalQuery: input.originalQuery,
        depth: input.depth,
        provider: 'ollama'
      }
    })
    
  } catch (error) {
    logger.error('Error processing follow-up research with Ollama', { error })
    throw error
  }
}
