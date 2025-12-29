/**
 * Analytics Logger Step
 * Subscribes to all terminal events for logging and analytics
 */
import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  eventType: z.string().optional(),
  timestamp: z.string().optional(),
  messageId: z.string().optional(),
  orderId: z.string().optional(),
  customerId: z.string().optional(),
  phone: z.string().optional(),
  amount: z.string().optional(),
  status: z.string().optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'AnalyticsLogger',
  description: 'Logs all terminal events for analytics and audit trail',
  subscribes: [
    'shopflow.refund.approved',
    'shopflow.cart.checkout',
    'shopflow.message.sent',
    'shopflow.escalation.resolved',
    'shopflow.draft_order.created',
    'shopflow.order.created',
  ],
  emits: [],
  flows: ['shopflow'],
  input: inputSchema,
};

export const handler: Handlers['AnalyticsLogger'] = async (input, { logger, state, traceId }) => {
  logger.info('Analytics event received', {
    traceId,
    eventType: input.eventType,
    messageId: input.messageId,
    orderId: input.orderId,
  });

  // Update counter for total events (using groupId: 'analytics', key: 'total_events')
  const totalCount = await state.get<number>('analytics', 'total_events') || 0;
  await state.set('analytics', 'total_events', totalCount + 1);

  logger.info('Analytics event logged', { 
    totalEvents: totalCount + 1,
  });
};
