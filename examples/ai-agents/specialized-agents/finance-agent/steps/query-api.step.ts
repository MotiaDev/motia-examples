import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
  query: z.string().min(1, "Query must not be empty")
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'FinanceQueryAPI',
  description: 'Accepts financial analysis queries from users',
  path: '/finance-query',
  method: 'POST',
  virtualSubscribes: ['flow.started'],
  emits: [{
    topic: 'query.received',
    label: 'Query received'
  }],
  bodySchema,
  flows: ['finance-workflow']
};

export const handler: Handlers['FinanceQueryAPI'] = async (req, { logger, emit, traceId }) => {
  logger.info('Finance query received', { query: req.body.query, traceId });
  
  try {
    // Emit the received query event to start the workflow
    await emit({ 
      topic: 'query.received', 
      data: { 
        query: req.body.query
      }
    });
    
    return { 
      status: 200, 
      body: { 
        message: 'Query received and processing started',
        traceId
      }
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error processing query', { error: errorMessage, traceId });
    return { 
      status: 500, 
      body: { 
        error: 'Failed to process query',
        message: errorMessage
      }
    };
  }
}; 