/**
 * Process Cart Recovery Batch Event Step
 * Sends personalized abandoned cart messages to customers
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { WhatsAppService } from '../services/whatsapp.service';
import { GeminiService } from '../services/gemini.service';

const inputSchema = z.object({
  carts: z.array(z.object({
    waId: z.string(),
    customerName: z.string(),
    customerPhone: z.string(),
    items: z.array(z.object({
      variantId: z.string(),
      title: z.string(),
      quantity: z.number(),
      price: z.string(),
    })),
    total: z.string(),
    reminderCount: z.number(),
  })),
  triggeredAt: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessCartRecoveryBatch',
  description: 'Processes batch of abandoned carts and sends recovery messages',
  subscribes: ['shopflow.cart.recovery.batch'],
  emits: [
    { topic: 'shopflow.response.sent', label: 'Response Sent' },
  ],
  flows: ['shopflow'],
  input: inputSchema,
};

// Different discount codes based on reminder count
const DISCOUNT_CODES: Record<number, string | undefined> = {
  1: undefined, // First reminder - no discount
  2: 'COMEBACK10', // Second reminder - 10% off
  3: 'LASTCHANCE15', // Third reminder - 15% off
};

export const handler: Handlers['ProcessCartRecoveryBatch'] = async (input, { emit, logger, state }) => {
  const { carts, triggeredAt } = input;

  logger.info('Processing cart recovery batch', { 
    cartCount: carts.length,
    triggeredAt,
  });

  let successCount = 0;
  let failCount = 0;

  for (const cart of carts) {
    try {
      const discountCode = DISCOUNT_CODES[cart.reminderCount];

      // Generate personalized message using Gemini
      const message = await GeminiService.generateAbandonedCartMessage(
        cart.customerName,
        cart.items.map(i => ({
          title: i.title,
          quantity: i.quantity,
          price: i.price,
        })),
        cart.total,
        discountCode
      );

      // Send WhatsApp message
      await WhatsAppService.sendTextMessage(cart.customerPhone, message);

      // Send action buttons
      const buttons = [
        { id: 'checkout_now', title: '✅ Checkout Now' },
      ];

      if (discountCode) {
        buttons.push({ id: `apply_${discountCode}`, title: `🎟️ Use ${discountCode}` });
      }

      buttons.push({ id: 'clear_cart', title: '🗑️ Not Interested' });

      await WhatsAppService.sendButtonMessage(
        cart.customerPhone,
        'Ready to complete your order?',
        buttons.slice(0, 3) // WhatsApp max 3 buttons
      );

      // Update cart state with reminder info
      const cartKey = `cart_${cart.waId}`;
      const existingCart = await state.get<Record<string, unknown>>('shopflow', cartKey);
      
      if (existingCart) {
        await state.set('shopflow', cartKey, {
          ...existingCart,
          lastReminderSent: new Date().toISOString(),
          reminderCount: cart.reminderCount,
          discountCode,
        });
      }

      await emit({
        topic: 'shopflow.response.sent',
        data: {
          waId: cart.waId,
          responseType: 'cart_recovery_reminder',
          reminderCount: cart.reminderCount,
        },
      });

      successCount++;

      // Rate limiting - wait 1 second between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('Failed to send cart recovery message', {
        waId: cart.waId,
        error: String(error),
      });
      failCount++;
    }
  }

  logger.info('Cart recovery batch completed', { successCount, failCount });
};

