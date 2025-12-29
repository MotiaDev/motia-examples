/**
 * Handle General Support Event Step
 * Handles general inquiries, greetings, and miscellaneous support requests
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
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
    discountCode: z.string().optional(),
  }).optional(),
  sentiment: z.string().optional(),
  intent: z.string().optional(),
  confidence: z.number().optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'HandleGeneralSupport',
  description: 'Handles general customer inquiries and greetings',
  subscribes: ['shopflow.intent.general'],
  emits: [
    { topic: 'shopflow.response.sent', label: 'Response Sent' },
  ],
  flows: ['shopflow'],
  input: inputSchema,
};

export const handler: Handlers['HandleGeneralSupport'] = async (input, { emit, logger, state }) => {
  const {
    from,
    customerName,
    waId,
    content,
    intent,
    entities,
  } = input;

  logger.info('Handling general support', { from, intent });

  try {
    // Handle greetings specially
    if (intent === 'greeting') {
      const greeting = `Hi ${customerName}! 👋 Welcome to ShopFlow!\n\nI'm your personal shopping assistant. Here's what I can help you with:\n\n📦 *Order Status* - Track your orders\n🛍️ *Product Recommendations* - Find the perfect products\n🛒 *Cart Recovery* - Complete your purchase\n💬 *Support* - Get answers to questions\n\nJust tell me what you need!`;

      await WhatsAppService.sendTextMessage(from, greeting);

      await WhatsAppService.sendButtonMessage(
        from,
        'Quick Actions',
        [
          { id: 'check_orders', title: '📦 My Orders' },
          { id: 'browse_products', title: '🛍️ Browse Products' },
          { id: 'talk_to_human', title: '💬 Human Support' },
        ]
      );

      await emit({
        topic: 'shopflow.response.sent',
        data: { waId, responseType: 'greeting' },
      });
      return;
    }

    // Handle discount code inquiries
    if (intent === 'discount_code' || entities?.discountCode) {
      const discountMessage = `Hi ${customerName}! 🎟️\n\nI'd be happy to help with discount codes!\n\n*How to apply a discount:*\n1. Add items to your cart\n2. Reply with your discount code\n3. I'll apply it to your order!\n\n*Current promotions:*\n• WELCOME10 - 10% off first order\n• FREESHIP - Free shipping on orders $50+\n\nDo you have a code you'd like to use?`;

      await WhatsAppService.sendTextMessage(from, discountMessage);

      await emit({
        topic: 'shopflow.response.sent',
        data: { waId, responseType: 'discount_info' },
      });
      return;
    }

    // Get conversation context
    const conversationKey = `conversation_${waId}`;
    const conversation = await state.get<{
      messages: Array<{ role: string; content: string; timestamp: string }>;
      customerId?: string;
      lastIntent?: string;
    }>('shopflow', conversationKey);

    const contextParts: string[] = [];
    if (conversation?.lastIntent) {
      contextParts.push(`Previous topic: ${conversation.lastIntent}`);
    }
    if (conversation?.messages && conversation.messages.length > 0) {
      const recentMessages = conversation.messages.slice(-3);
      contextParts.push(`Recent conversation:\n${recentMessages.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join('\n')}`);
    }

    // Generate AI response
    const response = await GeminiService.generateGeneralResponse(
      customerName,
      content,
      contextParts.join('\n\n')
    );

    await WhatsAppService.sendTextMessage(from, response);

    // Add helpful action buttons
    await WhatsAppService.sendButtonMessage(
      from,
      'Need more help?',
      [
        { id: 'check_orders', title: '📦 My Orders' },
        { id: 'browse_products', title: '🛍️ Products' },
        { id: 'talk_to_human', title: '💬 Human Agent' },
      ]
    );

    // Update conversation history
    if (conversation) {
      conversation.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      });
      await state.set('shopflow', conversationKey, {
        ...conversation,
        lastIntent: intent,
      });
    }

    await emit({
      topic: 'shopflow.response.sent',
      data: { waId, responseType: 'general_support', intent },
    });

    logger.info('General support response sent', { intent });
  } catch (error) {
    logger.error('Error handling general support', { error: String(error) });

    await WhatsAppService.sendTextMessage(
      from,
      `Hi ${customerName}! I'm here to help! 👋\n\nWhat can I assist you with today?\n\n• Track an order\n• Find products\n• Get support\n\nJust let me know!`
    );

    await emit({
      topic: 'shopflow.response.sent',
      data: { waId, responseType: 'fallback' },
    });
  }
};

