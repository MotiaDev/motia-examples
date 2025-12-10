import { EventConfig, StepHandler } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  query: z.string().optional(),
  timestamp: z.string(),
  response: z.any(),
  error: z.string().optional()
});

export const config: EventConfig<typeof inputSchema> = {
  type: 'event',
  name: 'SaveResultHandler',
  description: 'Saves completed analysis results to state for later retrieval',
  subscribes: ['analysis.completed'],
  emits: ['result.saved'],
  input: inputSchema,
  flows: ['finance-workflow']
};

export const handler: StepHandler<typeof config> = async (input, { logger, state, traceId }) => {
  logger.info('Saving analysis result', { traceId });
  
  try {
    // Store the full response data with analysis
    await state.set(traceId, 'response.data', {
      query: input.query,
      timestamp: input.timestamp,
      response: input.response,
      error: input.error,
      status: input.error ? 'error' : 'success'
    });
    
    logger.info('Analysis result saved successfully', { traceId });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to save analysis result', { error: errorMessage, traceId });
    
    // Try to save the error information
    try {
      await state.set(traceId, 'response.data', {
        error: 'Failed to save result: ' + errorMessage,
        timestamp: new Date().toISOString(),
        status: 'error'
      });
    } catch (storeError) {
      logger.error('Critical: Failed to save error information', { error: String(storeError) });
    }
  }
}; 