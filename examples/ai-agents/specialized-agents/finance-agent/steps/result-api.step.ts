import { ApiRouteConfig, StepHandler } from 'motia';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'FinanceResultAPI',
  description: 'Retrieves the results of a financial analysis by trace ID',
  path: '/finance-result/:traceId',
  method: 'GET',
  emits: [{
    topic: 'analysis.completed',
    label: 'Analysis completed'
  }],
  flows: ['finance-workflow']
};

export const handler: StepHandler<typeof config> = async (req, { logger, state }) => {
  const { traceId } = req.pathParams as { traceId: string };
  logger.info(`Result retrieval requested ${traceId}`);
  
  try {
    // Get all response data from state using the trace ID from the path
    const responseData = await state.get(traceId, 'response.data');
    
    if (!responseData) {
      logger.info('No results found for trace ID', { traceId });
      return { 
        status: 404, 
        body: { 
          error: 'No results found',
          message: 'No analysis results found for the provided trace ID' 
        }
      };
    }
    
    logger.info('Results retrieved successfully', { traceId });
    return { 
      status: 200, 
      body: responseData 
    };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Result retrieval failed', { error: errorMessage, traceId });
    
    return { 
      status: 500, 
      body: { 
        error: 'Failed to retrieve results',
        message: errorMessage
      }
    };
  }
}; 