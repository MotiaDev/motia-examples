import { EventConfig, StepHandler } from 'motia';
import { z } from 'zod';
import { ServiceFactory } from '../services/ServiceFactory';

const inputSchema = z.object({
  query: z.string()
});

export const config: EventConfig<typeof inputSchema> = {
  type: 'event',
  name: 'WebSearchAgent',
  description: 'Searches the web for information related to financial queries',
  subscribes: ['query.received'],
  emits: [{
    topic: 'web.search.completed',
    label: 'Web search completed'
  }],
  input: inputSchema,
  flows: ['finance-workflow']
};

export const handler: StepHandler<typeof config> = async (input, { logger, emit, state, traceId }) => {
  logger.info('Web search started', { query: input.query, traceId });
  
  try {
    // Create state service for easier state management
    const stateService = ServiceFactory.createStateService(state, traceId);
    
    // Store the original query in state
    await stateService.set('original.query', input.query);
    
    // Get the web search service
    const webSearchService = ServiceFactory.getWebSearchService();
    
    // Perform web search
    const searchResults = await webSearchService.search(input.query);
    
    logger.info('Web search completed', { 
      resultCount: searchResults.length,
      traceId 
    });
    
    // Save results to state
    await stateService.set('web.search.results', searchResults);
    
    // Emit completion event with summary
    await emit({
      topic: 'web.search.completed',
      data: {
        query: input.query,
        resultCount: searchResults.length,
        resultSummary: searchResults.slice(0, 3).map(r => r.title).join(', ') + '...'
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Web search failed', { error: errorMessage, traceId });
    
    // Emit completion event with error
    await emit({
      topic: 'web.search.completed',
      data: {
        query: input.query,
        error: errorMessage,
        resultCount: 0,
        results: []
      }
    });
  }
}; 