/**
 * Handle Refund Request Event Step
 * Processes refund requests with AI validation and escalation
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { ShopifyService } from '../services/shopify.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { GeminiService } from '../services/gemini.service';

const inputSchema = z.object({
  messageId: z.string(),
  from: z.string(),
  customerName: z.string(),
  waId: z.string(),
  content: z.string(),
  phoneNumberId: z.string(),
  customerId: z.string().optional(),
  entities: z.object({
    orderNumber: z.string().optional(),
    amount: z.string().optional(),
  }).optional(),
  sentiment: z.string().optional(),
  intent: z.string().optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'HandleRefundRequest',
  description: 'Processes customer refund requests with AI validation',
  subscribes: ['shopflow.intent.refund_request'],
  emits: [
    { topic: 'shopflow.response.sent', label: 'Response Sent' },
    { topic: 'shopflow.escalation.required', label: 'Escalation Needed' },
    { topic: 'shopflow.refund.approved', label: 'Refund Auto-Approved', conditional: true },
  ],
  flows: ['shopflow'],
  input: inputSchema,
};

export const handler: Handlers['HandleRefundRequest'] = async (input, { emit, logger, state, streams }) => {
  const {
    messageId,
    from,
    customerName,
    waId,
    content,
    phoneNumberId,
    entities,
    sentiment,
  } = input;

  logger.info('Handling refund request', { from, entities, sentiment });

  try {
    // Find the order
    let orders = [];
    
    if (entities?.orderNumber) {
      const orderQuery = entities.orderNumber.replace('#', '');
      orders = await ShopifyService.getOrders(5, `name:${orderQuery}`);
    } else {
      orders = await ShopifyService.getOrdersByPhone(from);
    }

    if (orders.length === 0) {
      await WhatsAppService.sendTextMessage(
        from,
        `Hi ${customerName},\n\nI'd be happy to help with your refund request! 🙏\n\nCould you please provide your order number? You can find it in your order confirmation email (it looks like #1234).`
      );

      await emit({
        topic: 'shopflow.response.sent',
        data: { waId, responseType: 'refund_need_order' },
      });
      return;
    }

    // If multiple orders, ask which one
    if (orders.length > 1 && !entities?.orderNumber) {
      const sections = [{
        title: 'Your Orders',
        rows: orders.slice(0, 10).map(order => ({
          id: `refund_${order.id.replace('gid://shopify/Order/', '')}`,
          title: `Order ${order.name}`,
          description: `${WhatsAppService.formatCurrency(order.totalPrice)} - ${new Date(order.createdAt).toLocaleDateString()}`,
        })),
      }];

      await WhatsAppService.sendListMessage(
        from,
        '📋 Select Order for Refund',
        `Hi ${customerName}! Which order would you like to request a refund for?`,
        'Select Order',
        sections
      );

      await emit({
        topic: 'shopflow.response.sent',
        data: { waId, responseType: 'refund_select_order' },
      });
      return;
    }

    const order = orders[0];

    // Validate refund request using Gemini
    const validation = await GeminiService.validateRefundRequest(
      order.id,
      order.createdAt,
      content,
      order.totalPrice
    );

    logger.info('Refund validation result', {
      orderId: order.id,
      approved: validation.approved,
      needsHumanReview: validation.needsHumanReview,
    });

    // Store refund request in state
    const refundKey = `refund_${order.id}`;
    await state.set('shopflow', refundKey, {
      orderId: order.id,
      orderName: order.name,
      customerPhone: from,
      customerName,
      reason: content,
      validation,
      status: validation.needsHumanReview ? 'pending_review' : (validation.approved ? 'auto_approved' : 'auto_rejected'),
      createdAt: new Date().toISOString(),
    });

    // Update dashboard stream
    if (streams.supportDashboard) {
      await streams.supportDashboard.set('refund_requests', order.id, {
        id: order.id,
        orderName: order.name,
        customerName,
        phone: from,
        amount: order.totalPrice,
        reason: content.substring(0, 200),
        status: validation.needsHumanReview ? 'pending' : (validation.approved ? 'approved' : 'rejected'),
        aiDecision: validation.reason,
        createdAt: new Date().toISOString(),
      });
    }

    if (validation.needsHumanReview) {
      // Escalate to human agent
      await WhatsAppService.sendTextMessage(
        from,
        `Hi ${customerName},\n\nThank you for reaching out about your refund for order *${order.name}*.\n\nI've noted your request and our support team will review it shortly. You should hear back within 24 hours.\n\n🙏 We appreciate your patience!`
      );

      await emit({
        topic: 'shopflow.escalation.required',
        data: {
          messageId,
          from,
          customerName,
          waId,
          content,
          phoneNumberId,
          reason: `Refund request requires review: ${validation.reason}`,
          sentiment: sentiment || 'neutral',
          orderId: order.id,
          orderName: order.name,
          orderTotal: order.totalPrice,
          refundValidation: validation,
        },
      });

      await emit({
        topic: 'shopflow.response.sent',
        data: { waId, responseType: 'refund_escalated', orderId: order.id },
      });
      return;
    }

    if (validation.approved) {
      await WhatsAppService.sendTextMessage(
        from,
        `Hi ${customerName},\n\n✅ *Good news!* Your refund request for order *${order.name}* has been approved!\n\n💰 *Amount:* ${WhatsAppService.formatCurrency(order.totalPrice)}\n\nThe refund will be processed within 5-7 business days and credited back to your original payment method.\n\nIs there anything else I can help you with?`
      );

      await emit({
        topic: 'shopflow.refund.approved',
        data: {
          waId,
          orderId: order.id,
          orderName: order.name,
          amount: order.totalPrice,
          customerPhone: from,
        },
      });

      await emit({
        topic: 'shopflow.response.sent',
        data: { waId, responseType: 'refund_approved', orderId: order.id },
      });
    } else {
      await WhatsAppService.sendTextMessage(
        from,
        `Hi ${customerName},\n\nThank you for reaching out about order *${order.name}*.\n\nUnfortunately, this order is outside our standard refund policy timeframe. However, I'd be happy to connect you with our support team to discuss your options.\n\nWould you like me to do that?`
      );

      await WhatsAppService.sendButtonMessage(
        from,
        'How would you like to proceed?',
        [
          { id: 'talk_to_human', title: '💬 Talk to Support' },
          { id: 'view_policy', title: '📋 Refund Policy' },
        ]
      );

      await emit({
        topic: 'shopflow.response.sent',
        data: { waId, responseType: 'refund_outside_policy', orderId: order.id },
      });
    }

    // Store in conversation
    const conversationKey = `conversation_${waId}`;
    const existing = await state.get<{
      messages: Array<{ role: string; content: string; timestamp: string }>;
    }>('shopflow', conversationKey);

    if (existing) {
      existing.messages.push({
        role: 'assistant',
        content: 'Processed refund request',
        timestamp: new Date().toISOString(),
      });
      await state.set('shopflow', conversationKey, existing);
    }

    logger.info('Refund request processed', {
      orderId: order.id,
      approved: validation.approved,
    });
  } catch (error) {
    logger.error('Error handling refund request', { error: String(error) });

    await WhatsAppService.sendTextMessage(
      from,
      `I'm sorry, ${customerName}, I'm having trouble processing your request right now. Let me connect you with our support team who can help! 🙏`
    );

    await emit({
      topic: 'shopflow.escalation.required',
      data: {
        messageId,
        from,
        customerName,
        waId,
        content,
        phoneNumberId,
        reason: `Refund processing error: ${String(error)}`,
        sentiment: 'neutral',
      },
    });
  }
};

