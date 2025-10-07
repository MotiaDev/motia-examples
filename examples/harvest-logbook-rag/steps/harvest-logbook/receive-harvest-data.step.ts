/**
 * Receive Harvest Data API Step
 * Entry point for the harvest logbook system
 * Receives harvest log data and triggers processing pipeline
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  id: z.string().optional(),
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
    500: z.object({ error: z.string() })
  }
};

export const handler: Handlers['ReceiveHarvestData'] = async (req, { emit, logger, state }) => {
  try {
    const { content, id, metadata, query, conversationHistory } = bodySchema.parse(req.body);
    
    const entryId = id || `harvest-${Date.now()}`;
    
    logger.info('Received harvest log data', {
      entryId,
      contentLength: content.length,
      hasQuery: !!query
    });

    // Store the entry data in state for processing
    await state.set('harvest-entries', entryId, {
      content,
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
        metadata
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

    logger.info('Harvest log data queued for processing', { entryId });

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Validation error', { error: error.message });
      return {
        status: 400,
        body: { error: 'Validation failed: ' + error.errors[0].message }
      };
    }

    logger.error('Failed to receive harvest data', { error });
    return {
      status: 500,
      body: { error: 'Failed to process harvest data' }
    };
  }
};
