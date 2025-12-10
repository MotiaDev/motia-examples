/**
 * Query Only API Step
 * Separate endpoint for querying the harvest logbook without storing new data
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { harvestQueryMiddleware } from '../../middlewares/authz.middleware';
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware';

const bodySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  farmId: z.string().min(1, 'Farm ID is required for authorization'),
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
  middleware: [errorHandlerMiddleware, harvestQueryMiddleware],
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
    401: z.object({ error: z.string(), message: z.string() }),
    403: z.object({ error: z.string(), message: z.string() }),
    500: z.object({ error: z.string() })
  }
};

export const handler: Handlers['QueryHarvestLogbook'] = async (req, { emit, logger }) => {
  const { query, farmId, conversationHistory } = bodySchema.parse(req.body);
  
  const queryId = `query-${Date.now()}`;
  
  // Authorization info is available from middleware
  const userId = (req as any).authz?.userId;
  
  logger.info('Received query for harvest logbook', {
    queryId,
    farmId,
    userId,
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
};
