import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
  text: z.string().min(1, "Text content cannot be empty"),
  metadata: z.record(z.any()).optional(),
  query: z.string().optional()
});

const responseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  traceId: z.string()
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'WebhookTrigger',
  description: 'Currency Rate Monitor webhook endpoint',
  path: '/currency-rate-monitor',
  method: 'POST',
  emits: [
    'text.split',
    'rag.process'
  ],
  flows: ['currency-rate-monitor'],
  bodySchema,
  responseSchema: {
    200: responseSchema,
    400: z.object({ error: z.string() })
  }
};

export const handler: Handlers['WebhookTrigger'] = async (req, { emit, logger, state }) => {
  try {
    const { text, metadata, query } = bodySchema.parse(req.body);
    
    logger.info('Received currency rate data', { 
      textLength: text.length,
      hasMetadata: !!metadata,
      hasQuery: !!query
    });

    // Store the original request in state for later use
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await state.set('requests', requestId, {
      text,
      metadata,
      query,
      timestamp: new Date().toISOString()
    });

    // Emit to text splitter for processing and storage
    await emit({
      topic: 'text.split',
      data: {
        requestId,
        text,
        metadata
      }
    });

    // If there's a query, process it with RAG
    if (query) {
      await emit({
        topic: 'rag.process',
        data: {
          requestId,
          query,
          metadata
        }
      });
    }

    logger.info('Successfully processed webhook request', { requestId });

    return {
      status: 200,
      body: {
        success: true,
        message: 'Currency rate data received and processing',
        traceId: requestId
      }
    };
  } catch (error) {
    logger.error('Webhook processing failed', { error: (error as Error).message });
    return {
      status: 400,
      body: { error: 'Invalid request data' }
    };
  }
};

