/**
 * Classify Intent Event Step
 * Uses Gemini AI to classify customer intent and route to appropriate workflow
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { GeminiService, CustomerIntent } from '../services/gemini.service';
import { ShopifyService } from '../services/shopify.service';

const inputSchema = z.object({
  messageId: z.string(),
  from: z.string(),
  customerName: z.string(),
  waId: z.string(),
  content: z.string(),
  type: z.string(),
  interactiveData: z.object({
    id: z.string(),
    title: z.string(),
  }).optional(),
  timestamp: z.string(),
  phoneNumberId: z.string(),
  conversationHistory: z.array(z.object({
    role: z.string(),
    content: z.string(),
    timestamp: z.string(),
  })),
});

export const config: EventConfig = {
  type: 'event',
  name: 'ClassifyIntent',
  description: 'Classifies customer intent using Gemini AI and routes to appropriate handler',
  subscribes: ['shopflow.message.received'],
  emits: [
    { topic: 'shopflow.intent.order_status', label: 'Order Status Query' },
    { topic: 'shopflow.intent.product_recommendation', label: 'Product Recommendation' },
    { topic: 'shopflow.intent.cart_recovery', label: 'Cart Recovery' },
    { topic: 'shopflow.intent.refund_request', label: 'Refund Request' },
    { topic: 'shopflow.intent.general', label: 'General Support' },
    { topic: 'shopflow.escalation.required', label: 'Human Escalation', conditional: true },
  ],
  flows: ['shopflow'],
  input: inputSchema,
};

export const handler: Handlers['ClassifyIntent'] = async (input, { emit, logger, state }) => {
  const {
    messageId,
    from,
    customerName,
    waId,
    content,
    type,
    interactiveData,
    timestamp,
    phoneNumberId,
    conversationHistory,
  } = input;

  logger.info('Classifying intent', { from, contentPreview: content.substring(0, 50) });

  // Handle interactive responses (button clicks, list selections)
  if (type === 'button_reply' || type === 'list_reply') {
    const buttonId = interactiveData?.id || '';
    
    // Route based on button/list action ID
    if (buttonId.startsWith('order_')) {
      await emit({
        topic: 'shopflow.intent.order_status',
        data: {
          messageId,
          from,
          customerName,
          waId,
          content,
          phoneNumberId,
          action: buttonId,
          orderId: buttonId.replace('order_', ''),
        },
      });
      return;
    }

    if (buttonId.startsWith('product_')) {
      await emit({
        topic: 'shopflow.intent.product_recommendation',
        data: {
          messageId,
          from,
          customerName,
          waId,
          content,
          phoneNumberId,
          action: buttonId,
          productId: buttonId.replace('product_', ''),
        },
      });
      return;
    }

    if (buttonId === 'checkout_now' || buttonId.startsWith('cart_')) {
      await emit({
        topic: 'shopflow.intent.cart_recovery',
        data: {
          messageId,
          from,
          customerName,
          waId,
          content,
          phoneNumberId,
          action: buttonId,
        },
      });
      return;
    }

    if (buttonId === 'talk_to_human') {
      await emit({
        topic: 'shopflow.escalation.required',
        data: {
          messageId,
          from,
          customerName,
          waId,
          content,
          phoneNumberId,
          reason: 'Customer requested human agent',
          sentiment: 'neutral',
        },
      });
      return;
    }
  }

  // Classify intent using Gemini
  const classification = await GeminiService.classifyIntent(
    content,
    conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
  );

  logger.info('Intent classified', {
    intent: classification.intent,
    confidence: classification.confidence,
    sentiment: classification.sentiment,
    requiresEscalation: classification.requiresEscalation,
  });

  // Store classification in state for analytics
  await state.set('shopflow', `intent_${messageId}`, {
    ...classification,
    timestamp,
    waId,
  });

  // Check if escalation is needed
  if (classification.requiresEscalation) {
    await emit({
      topic: 'shopflow.escalation.required',
      data: {
        messageId,
        from,
        customerName,
        waId,
        content,
        phoneNumberId,
        reason: 'AI flagged for human review',
        sentiment: classification.sentiment,
        intent: classification.intent,
        entities: classification.entities,
      },
    });
    return;
  }

  // Look up customer by phone for personalization
  let customer = await ShopifyService.getCustomerByPhone(from);
  const customerId = customer?.id;

  // Update conversation with customer ID
  if (customerId) {
    const conversationKey = `conversation_${waId}`;
    const existing = await state.get<{ messages: unknown[]; lastIntent?: string }>(
      'shopflow',
      conversationKey
    );
    if (existing) {
      await state.set('shopflow', conversationKey, {
        ...existing,
        customerId,
        lastIntent: classification.intent,
      });
    }
  }

  // Route to appropriate handler based on intent
  const baseData = {
    messageId,
    from,
    customerName,
    waId,
    content,
    phoneNumberId,
    customerId,
    entities: classification.entities,
    sentiment: classification.sentiment,
    confidence: classification.confidence,
  };

  const intentRouting: Record<CustomerIntent, string> = {
    order_status: 'shopflow.intent.order_status',
    order_tracking: 'shopflow.intent.order_status',
    product_recommendation: 'shopflow.intent.product_recommendation',
    product_search: 'shopflow.intent.product_recommendation',
    cart_recovery: 'shopflow.intent.cart_recovery',
    discount_code: 'shopflow.intent.general',
    refund_request: 'shopflow.intent.refund_request',
    shipping_update: 'shopflow.intent.order_status',
    general_support: 'shopflow.intent.general',
    greeting: 'shopflow.intent.general',
    unknown: 'shopflow.intent.general',
  };

  const topic = intentRouting[classification.intent] || 'shopflow.intent.general';

  await emit({
    topic,
    data: {
      ...baseData,
      intent: classification.intent,
    },
  });

  logger.info('Intent routed', { intent: classification.intent, topic });
};

