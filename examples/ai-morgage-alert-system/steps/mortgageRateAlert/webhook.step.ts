import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  query: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const config: ApiRouteConfig = {
  name: 'MortgageRateAlertWebhook',
  type: 'api',
  description: 'Webhook endpoint to receive mortgage rate data for processing and analysis',
  path: '/mortgage_rate_alert',
  method: 'POST',
  emits: ['process-mortgage-data'],
  flows: ['mortgage-rate-alert'],
  bodySchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      traceId: z.string()
    }),
    400: z.object({ error: z.string() })
  }
};

export const handler: Handlers['MortgageRateAlertWebhook'] = async (req, { emit, logger, state }) => {
  const { content, query, metadata } = bodySchema.parse(req.body);
  
  logger.info('Received mortgage rate data', { 
    contentLength: content.length,
    hasQuery: !!query 
  });
  
  const dataId = `mortgage-${Date.now()}`;
  await state.set('mortgage-data', dataId, {
    content,
    query: query || '',
    metadata: metadata || {},
    timestamp: new Date().toISOString()
  });
  
  await emit({
    topic: 'process-mortgage-data',
    data: {
      dataId,
      content,
      query: query || 'Analyze mortgage rate information',
      hasQuery: !!query
    }
  });
  
  logger.info('Mortgage data queued for processing', { dataId });

  return {
    status: 200,
    body: { 
      success: true,
      message: 'Mortgage data received and queued for processing',
      traceId: dataId
    }
  };
};

