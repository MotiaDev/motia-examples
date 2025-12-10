/**
 * Receive Harvest Data API Step
 * Entry point for the harvest logbook system
 * Receives harvest log data and triggers processing pipeline
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { harvestEntryEditMiddleware } from '../../middlewares/authz.middleware';
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware';

const bodySchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  id: z.string().optional(),
  farmId: z.string().min(1, 'Farm ID is required for authorization'),
  metadata: z.record(z.any()).optional(),
  query: z.string().optional(), // Optional query to run against the stored data
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).optional()
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ReceiveHarvestData',
  description: 'Receives harvest log data and processes it through the RAG pipeline',
  path: '/harvest_logbook',
  method: 'POST',
  middleware: [errorHandlerMiddleware, harvestEntryEditMiddleware],
  emits: [
    {
      topic: 'process-embeddings',
      label: 'Process & Store Embeddings'
    },
    {
      topic: 'query-agent',
      label: 'Query AI Agent',
      conditional: true
    }
  ],
  flows: ['harvest-logbook'],
  bodySchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      entryId: z.string(),
      vectorIds: z.array(z.string()).optional(),
      agentResponse: z.string().optional()
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string(), message: z.string() }),
    403: z.object({ error: z.string(), message: z.string() }),
    500: z.object({ error: z.string() })
  }
};

export const handler: Handlers['ReceiveHarvestData'] = async (req, { emit, logger, state }) => {
  const { content, id, farmId, metadata, query, conversationHistory } = bodySchema.parse(req.body);
  
  const entryId = id || `harvest-${Date.now()}`;
  
  // Authorization info is available from middleware
  const userId = (req as any).authz?.userId;
  
  logger.info('Received harvest log data', {
    entryId,
    farmId,
    userId,
    contentLength: content.length,
    hasQuery: !!query
  });

  // Store the entry data in state for processing
  await state.set('harvest-entries', entryId, {
    content,
    farmId,
    userId,
    metadata,
    timestamp: new Date().toISOString(),
    query,
    conversationHistory
  });

  // Emit event to process embeddings and store in vector DB
  await emit({
    topic: 'process-embeddings',
    data: {
      entryId,
      content,
      metadata: {
        ...metadata,
        farmId,
        userId
      }
    }
  });

  // If a query is provided, also trigger the agent query
  if (query) {
    await emit({
      topic: 'query-agent',
      data: {
        entryId,
        query,
        conversationHistory: conversationHistory || []
      }
    });
  }

  logger.info('Harvest log data queued for processing', { entryId, farmId });

  return {
    status: 200,
    body: {
      success: true,
      message: query 
        ? 'Data received and query initiated' 
        : 'Data received and processing started',
      entryId
    }
  };
};
