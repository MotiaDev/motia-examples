import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { ServiceFactory } from '../services/ServiceFactory';
import { AnalysisInput } from '../services/OpenAIService';

// Define input schema for data to analyze
const inputSchema = z.object({
  query: z.string().optional(),
  timestamp: z.string(),
  response: z.any()
});

export const config: EventConfig<typeof inputSchema> = {
  type: 'event',
  name: 'OpenAIAnalysisHandler',
  description: 'Analyzes financial data using OpenAI',
  subscribes: ['response.completed'],
  emits: [{
    topic: 'analysis.completed',
    label: 'Analysis completed'
  }],
  input: inputSchema,
  flows: ['finance-workflow']
};

export const handler: Handlers['OpenAIAnalysisHandler'] = async (input, { logger, emit, state, traceId }) => {
  logger.info('Starting OpenAI analysis', { traceId });
  
  try {
    // Check if we have necessary data
    if (!input.response) {
      const errorMessage = 'No data available for analysis';
      logger.error(errorMessage, { traceId });
      
      await emit({
        topic: 'analysis.completed',
        data: {
          ...input,
          analysis: null,
          error: errorMessage
        }
      });
      return;
    }
    
    // Create a state service for easier state management
    const stateService = ServiceFactory.createStateService(state, traceId);
    
    // Extract data from response
    const { query, response } = input;
    
    // Prepare input data for analysis
    const analysisInput: AnalysisInput = {
      query,
      webResources: response.webResources || [],
      financialData: response.financialData || []
    };
    
    // Get the OpenAI service
    const openAIService = ServiceFactory.getOpenAIService();
    
    // Perform OpenAI analysis
    const analysis = await openAIService.performAnalysis(analysisInput);
    
    // Store analysis in state
    await stateService.set('ai.analysis', analysis);
    
    // Enhance the original response with AI insights
    const enhancedResponse = {
      ...input.response,
      aiAnalysis: analysis
    };
    
    logger.info('OpenAI analysis completed successfully', { traceId });
    
    // Emit completion event with enhanced response
    await emit({
      topic: 'analysis.completed',
      data: {
        query: input.query,
        timestamp: input.timestamp,
        response: enhancedResponse
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('OpenAI analysis failed', { error: errorMessage, traceId });
    
    // Emit error event
    await emit({
      topic: 'analysis.completed',
      data: {
        ...input,
        error: errorMessage
      }
    });
  }
}; 