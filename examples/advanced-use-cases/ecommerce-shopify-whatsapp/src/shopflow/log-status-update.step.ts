/**
 * Log Status Update Event Step
 * Logs WhatsApp message delivery status updates
 */

import { EventConfig, Handlers } from 'motia';
import { z, ZodObject } from 'zod';

const inputSchema: ZodObject<any> = z.object({
  messageId: z.string(),
  status: z.string(),
  recipientId: z.string(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'LogStatusUpdate',
  description: 'Logs WhatsApp message delivery status updates',
  subscribes: ['shopflow.status.updated'],
  emits: [],
  flows: ['shopflow'],
  input: inputSchema,
};

export const handler: Handlers['LogStatusUpdate'] = async (input, { logger, state }) => {
  const { messageId, status, recipientId, timestamp } = input;

  logger.info('Message status updated', {
    messageId,
    status,
    recipientId,
    timestamp,
  });

  // Track delivery statistics
  const today = new Date().toISOString().split('T')[0];
  const deliveryKey = `delivery_stats_${today}`;
  
  const stats = await state.get<{
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    lastUpdated: string;
  }>('shopflow', deliveryKey) || {
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    lastUpdated: new Date().toISOString(),
  };

  // Update counters based on status
  switch (status) {
    case 'sent':
      stats.sent++;
      break;
    case 'delivered':
      stats.delivered++;
      break;
    case 'read':
      stats.read++;
      break;
    case 'failed':
      stats.failed++;
      break;
  }

  stats.lastUpdated = new Date().toISOString();
  await state.set('shopflow', deliveryKey, stats);
};

