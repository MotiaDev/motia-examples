/**
 * Handle Escalation Event Step
 * Routes complex issues to human agents and updates support dashboard
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { WhatsAppService } from '../services/whatsapp.service';

const inputSchema = z.object({
  messageId: z.string(),
  from: z.string(),
  customerName: z.string(),
  waId: z.string(),
  content: z.string(),
  phoneNumberId: z.string(),
  reason: z.string(),
  sentiment: z.string(),
  intent: z.string().optional(),
  entities: z.record(z.string(), z.any()).optional(),
  orderId: z.string().optional(),
  orderName: z.string().optional(),
  orderTotal: z.string().optional(),
  refundValidation: z.object({
    approved: z.boolean(),
    reason: z.string(),
    needsHumanReview: z.boolean(),
  }).optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'HandleEscalation',
  description: 'Handles escalation to human agents and updates dashboard',
  subscribes: ['shopflow.escalation.required'],
  emits: [
    { topic: 'shopflow.response.sent', label: 'Response Sent' },
  ],
  flows: ['shopflow'],
  input: inputSchema,
};

export const handler: Handlers['HandleEscalation'] = async (input, { emit, logger, state, streams }) => {
  const {
    from,
    customerName,
    waId,
    content,
    reason,
    sentiment,
    intent,
    orderId,
    orderName,
    orderTotal,
  } = input;

  logger.info('Handling escalation', { from, reason, sentiment });

  // Generate ticket ID
  const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;

  // Store escalation in state
  const escalationData = {
    ticketId,
    customerName,
    customerPhone: from,
    waId,
    message: content,
    reason,
    sentiment,
    intent,
    orderId,
    orderName,
    orderTotal,
    status: 'pending',
    priority: sentiment === 'negative' ? 'high' : 'normal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await state.set('shopflow', `escalation_${ticketId}`, escalationData);

  // Add to pending escalations list
  const pendingKey = 'pending_escalations';
  const pendingList = await state.get<string[]>('shopflow', pendingKey) || [];
  pendingList.push(ticketId);
  await state.set('shopflow', pendingKey, pendingList);

  // Update support dashboard stream
  if (streams.supportDashboard) {
    // Add to escalations stream
    await streams.supportDashboard.set('escalations', ticketId, {
      id: ticketId,
      ...escalationData,
    });

    // Update conversation status
    await streams.supportDashboard.set('conversations', waId, {
      id: waId,
      customerName,
      phone: from,
      lastMessage: content.substring(0, 100),
      lastIntent: intent || 'escalation',
      status: 'escalated',
      ticketId,
      priority: escalationData.priority,
      updatedAt: new Date().toISOString(),
    });

    // Send ephemeral notification to dashboard
    await streams.supportDashboard.send(
      { groupId: 'notifications' },
      {
        type: 'new_escalation',
        data: {
          ticketId,
          customerName,
          priority: escalationData.priority,
          preview: content.substring(0, 50),
        },
      }
    );
  }

  // Send confirmation to customer
  const priorityMessage = sentiment === 'negative' 
    ? "I've marked this as a priority case, and"
    : "I've created a support ticket, and";

  await WhatsAppService.sendTextMessage(
    from,
    `Hi ${customerName},\n\n🎟️ *Ticket Created: ${ticketId}*\n\n${priorityMessage} one of our support specialists will reach out to you shortly.\n\n⏰ *Expected response:* Within 2-4 hours during business hours\n\n${orderName ? `📦 *Related Order:* ${orderName}\n` : ''}Is there anything else you'd like me to note for our team?`
  );

  // Store in conversation history
  const conversationKey = `conversation_${waId}`;
  const conversation = await state.get<{
    messages: Array<{ role: string; content: string; timestamp: string }>;
  }>('shopflow', conversationKey);

  if (conversation) {
    conversation.messages.push({
      role: 'assistant',
      content: `Created support ticket ${ticketId}`,
      timestamp: new Date().toISOString(),
    });
    await state.set('shopflow', conversationKey, conversation);
  }

  await emit({
    topic: 'shopflow.response.sent',
    data: {
      waId,
      responseType: 'escalation_created',
      ticketId,
      priority: escalationData.priority,
    },
  });

  logger.info('Escalation created', { ticketId, priority: escalationData.priority });
};

