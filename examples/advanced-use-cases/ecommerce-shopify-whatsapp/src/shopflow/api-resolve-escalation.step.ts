/**
 * Resolve Escalation API Step
 * Allows agents to resolve escalation tickets
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { errorHandlerMiddleware } from '../middlewares/error-handler.middleware';
import { WhatsAppService } from '../services/whatsapp.service';

const bodySchema = z.object({
  ticketId: z.string(),
  resolution: z.string().min(1, 'Resolution message is required'),
  status: z.enum(['resolved', 'closed']).default('resolved'),
  sendToCustomer: z.boolean().default(true),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ResolveEscalation',
  description: 'Resolves an escalation ticket',
  path: '/dashboard/escalations/:ticketId/resolve',
  method: 'POST',
  emits: [
    { topic: 'shopflow.escalation.resolved', label: 'Escalation Resolved' },
  ],
  flows: ['shopflow'],
  middleware: [errorHandlerMiddleware],
  bodySchema,
  responseSchema: {
    200: z.object({ success: z.boolean(), ticketId: z.string() }),
    404: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['ResolveEscalation'] = async (req, { emit, logger, state, streams }) => {
  const ticketId = req.pathParams.ticketId;
  const body = bodySchema.parse(req.body);

  logger.info('Resolving escalation', { ticketId });

  try {
    // Get escalation data
    const escalation = await state.get<{
      ticketId: string;
      customerName: string;
      customerPhone: string;
      waId: string;
      status: string;
      priority: string;
      createdAt: string;
      updatedAt: string;
    }>('shopflow', `escalation_${ticketId}`);

    if (!escalation) {
      return {
        status: 404,
        body: { error: 'Escalation not found' },
      };
    }

    // Update escalation status
    await state.set('shopflow', `escalation_${ticketId}`, {
      ...escalation,
      status: body.status,
      resolution: body.resolution,
      updatedAt: new Date().toISOString(),
    });

    // Remove from pending list
    const pendingIds = await state.get<string[]>('shopflow', 'pending_escalations') || [];
    const updatedPendingIds = pendingIds.filter(id => id !== ticketId);
    await state.set('shopflow', 'pending_escalations', updatedPendingIds);

    // Update dashboard stream
    if (streams.supportDashboard) {
      await streams.supportDashboard.set('escalations', ticketId, {
        ...escalation,
        id: ticketId,
        status: body.status,
        updatedAt: new Date().toISOString(),
      });

      await streams.supportDashboard.set('conversations', escalation.waId, {
        id: escalation.waId,
        customerName: escalation.customerName,
        phone: escalation.customerPhone,
        lastMessage: 'Escalation resolved',
        lastIntent: 'resolved',
        status: 'resolved',
        updatedAt: new Date().toISOString(),
      });
    }

    // Send resolution to customer if requested
    if (body.sendToCustomer) {
      await WhatsAppService.sendTextMessage(
        escalation.customerPhone,
        `Hi ${escalation.customerName},\n\n✅ *Update on Ticket ${ticketId}*\n\n${body.resolution}\n\nThank you for your patience! Is there anything else I can help you with?`
      );

      // Update conversation history
      const conversationKey = `conversation_${escalation.waId}`;
      const conversation = await state.get<{
        messages: Array<{ role: string; content: string; timestamp: string }>;
      }>('shopflow', conversationKey);

      if (conversation) {
        conversation.messages.push({
          role: 'assistant',
          content: body.resolution,
          timestamp: new Date().toISOString(),
        });
        await state.set('shopflow', conversationKey, conversation);
      }
    }

    await emit({
      topic: 'shopflow.escalation.resolved',
      data: {
        ticketId,
        customerPhone: escalation.customerPhone,
        resolution: body.resolution,
        status: body.status,
      },
    });

    logger.info('Escalation resolved', { ticketId, status: body.status });

    return {
      status: 200,
      body: { success: true, ticketId },
    };
  } catch (error) {
    logger.error('Error resolving escalation', { ticketId, error: String(error) });
    throw error;
  }
};

