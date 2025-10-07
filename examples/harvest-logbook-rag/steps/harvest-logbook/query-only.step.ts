/**
 * Query Only API Step
 * Separate endpoint for querying the harvest logbook without storing new data
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).optional()
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'QueryHarvestLogbook',
  description: 'Query the harvest logbook knowledge base without storing new data',
  path: '/harvest_logbook/query',
  method: 'POST',
  emits: ['query-agent'],
  flows: ['harvest-logbook'],
  bodySchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      queryId: z.string()
    }),
    400: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  }
};

export const handler: Handlers['QueryHarvestLogbook'] = async (req, { emit, logger }) => {
  try {
    const { query, conversationHistory } = bodySchema.parse(req.body);
    
    const queryId = `query-${Date.now()}`;
    
    logger.info('Received query for harvest logbook', {
      queryId,
      queryLength: query.length
    });

    // Trigger agent query
    await emit({
      topic: 'query-agent',
      data: {
        entryId: queryId,
        query,
        conversationHistory: conversationHistory || []
      }
    });

    return {
      status: 200,
      body: {
        success: true,
        message: 'Query initiated',
        queryId
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Validation error', { error: error.message });
      return {
        status: 400,
        body: { error: 'Validation failed: ' + error.errors[0].message }
      };
    }

    logger.error('Failed to process query', { error });
    return {
      status: 500,
      body: { error: 'Failed to process query' }
    };
  }
};
