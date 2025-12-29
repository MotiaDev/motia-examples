/**
 * Log Response Event Step
 * Logs all responses for analytics and debugging
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  waId: z.string(),
  responseType: z.string(),
  intent: z.string().optional(),
  orderId: z.string().optional(),
  orderName: z.string().optional(),
  productId: z.string().optional(),
  productCount: z.number().optional(),
  itemCount: z.number().optional(),
  ticketId: z.string().optional(),
  priority: z.string().optional(),
  reminderCount: z.number().optional(),
  discountCode: z.string().optional(),
  orderCount: z.number().optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'LogResponse',
  description: 'Logs all ShopFlow responses for analytics',
  subscribes: ['shopflow.response.sent'],
  emits: [],
  flows: ['shopflow'],
  input: inputSchema,
};

export const handler: Handlers['LogResponse'] = async (input, { logger, state, streams }) => {
  const { waId, responseType, ...metadata } = input;

  logger.info('Response sent', {
    waId,
    responseType,
    ...metadata,
  });

  // Update analytics counters
  const today = new Date().toISOString().split('T')[0];
  const analyticsKey = `analytics_${today}`;
  
  const analytics = await state.get<{
    totalResponses: number;
    responseTypes: Record<string, number>;
    lastUpdated: string;
  }>('shopflow', analyticsKey) || {
    totalResponses: 0,
    responseTypes: {},
    lastUpdated: new Date().toISOString(),
  };

  analytics.totalResponses++;
  analytics.responseTypes[responseType] = (analytics.responseTypes[responseType] || 0) + 1;
  analytics.lastUpdated = new Date().toISOString();

  await state.set('shopflow', analyticsKey, analytics);

  // Update dashboard stream with latest activity
  if (streams.supportDashboard) {
    await streams.supportDashboard.send(
      { groupId: 'activity' },
      {
        type: 'response_logged',
        data: {
          waId,
          responseType,
          timestamp: new Date().toISOString(),
        },
      }
    );
  }
};

