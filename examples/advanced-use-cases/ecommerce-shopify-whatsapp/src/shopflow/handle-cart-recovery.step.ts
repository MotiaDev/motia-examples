/**
 * Handle Cart Recovery Event Step
 * Manages abandoned cart recovery and checkout assistance
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
    discountCode: z.string().optional(),
  }).optional(),
  sentiment: z.string().optional(),
  intent: z.string().optional(),
  action: z.string().optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'HandleCartRecovery',
  description: 'Handles abandoned cart recovery and checkout assistance',
  subscribes: ['shopflow.intent.cart_recovery'],
  emits: [
    { topic: 'shopflow.response.sent', label: 'Response Sent' },
    { topic: 'shopflow.cart.checkout', label: 'Checkout Initiated', conditional: true },
  ],
  flows: ['shopflow'],
  input: inputSchema,
};

export const handler: Handlers['HandleCartRecovery'] = async (input, { emit, logger, state }) => {
  const {
    from,
    customerName,
    waId,
    action,
    entities,
  } = input;

  logger.info('Handling cart recovery', { from, action });

  try {
    // Get abandoned cart data from state
    const cartKey = `cart_${waId}`;
    const cartData = await state.get<{
      items: Array<{ variantId: string; title: string; quantity: number; price: string }>;
      total: string;
      draftOrderId?: string;
      createdAt: string;
      discountCode?: string;
    }>('shopflow', cartKey);

    // Handle checkout action
    if (action === 'checkout_now' && cartData?.draftOrderId) {
      try {
        const result = await ShopifyService.completeDraftOrder(cartData.draftOrderId);
        
        await WhatsAppService.sendTextMessage(
          from,
          `🎉 *Order Confirmed!*\n\nThank you, ${customerName}! Your order has been placed successfully.\n\n📦 Order: ${result.draftOrder.name}\n💰 Total: ${WhatsAppService.formatCurrency(result.draftOrder.totalPrice)}\n\nYou'll receive a confirmation email shortly!`
        );

        // Clear cart from state
        await state.delete('shopflow', cartKey);

        await emit({
          topic: 'shopflow.cart.checkout',
          data: { waId, draftOrderId: cartData.draftOrderId, success: true },
        });

        await emit({
          topic: 'shopflow.response.sent',
          data: { waId, responseType: 'checkout_complete' },
        });
        return;
      } catch (error) {
        logger.error('Checkout failed', { error: String(error) });
        
        await WhatsAppService.sendTextMessage(
          from,
          `I'm sorry, ${customerName}, there was an issue processing your checkout. Let me connect you with our team to help complete your order! 🙏`
        );

        await emit({
          topic: 'shopflow.response.sent',
          data: { waId, responseType: 'checkout_error' },
        });
        return;
      }
    }

    // Handle discount code application
    if (entities?.discountCode && cartData) {
      const discountCode = entities.discountCode.toUpperCase();
      
      // Store discount code in cart
      await state.set('shopflow', cartKey, {
        ...cartData,
        discountCode,
      });

      await WhatsAppService.sendTextMessage(
        from,
        `✅ Great! I've noted your discount code *${discountCode}*. It will be applied at checkout!\n\nReady to complete your order?`
      );

      await WhatsAppService.sendButtonMessage(
        from,
        'Proceed with your order',
        [
          { id: 'checkout_now', title: '✅ Checkout Now' },
          { id: 'view_cart', title: '🛒 View Cart' },
        ]
      );

      await emit({
        topic: 'shopflow.response.sent',
        data: { waId, responseType: 'discount_applied', discountCode },
      });
      return;
    }

    // If no cart found, check for draft orders
    if (!cartData) {
      const draftOrders = await ShopifyService.listDraftOrders(5);
      
      // Look for draft orders that might be associated with this customer
      const customerDrafts = draftOrders.filter(d => 
        d.customer?.email || d.status === 'open'
      );

      if (customerDrafts.length === 0) {
        await WhatsAppService.sendTextMessage(
          from,
          `Hi ${customerName}! 👋\n\nI don't see any items in your cart right now. Would you like me to help you find something?\n\n🛍️ Just tell me what you're looking for!`
        );

        await emit({
          topic: 'shopflow.response.sent',
          data: { waId, responseType: 'no_cart_found' },
        });
        return;
      }

      // Show draft orders as potential carts
      const sections = [{
        title: 'Your Saved Carts',
        rows: customerDrafts.slice(0, 5).map(d => ({
          id: `cart_${d.id.replace('gid://shopify/DraftOrder/', '')}`,
          title: `Cart ${d.name}`,
          description: `${WhatsAppService.formatCurrency(d.totalPrice)} - ${d.lineItems.edges.length} items`,
        })),
      }];

      await WhatsAppService.sendListMessage(
        from,
        '🛒 Your Saved Carts',
        `Hi ${customerName}! I found some saved carts. Would you like to continue with one of them?`,
        'View Carts',
        sections
      );

      await emit({
        topic: 'shopflow.response.sent',
        data: { waId, responseType: 'draft_orders_list' },
      });
      return;
    }

    // Display current cart with recovery message
    const cartItems = cartData.items.map(i => `• ${i.quantity}x ${i.title} - ${i.price}`).join('\n');
    const discountNote = cartData.discountCode 
      ? `\n🎟️ *Discount:* ${cartData.discountCode} applied!` 
      : '';

    const message = await GeminiService.generateAbandonedCartMessage(
      customerName,
      cartData.items.map(i => ({
        title: i.title,
        quantity: i.quantity,
        price: i.price,
      })),
      cartData.total,
      cartData.discountCode
    );

    await WhatsAppService.sendTextMessage(from, message);

    // Show cart details
    await WhatsAppService.sendTextMessage(
      from,
      `🛒 *Your Cart*\n\n${cartItems}\n\n💰 *Total:* ${cartData.total}${discountNote}`
    );

    // Add action buttons
    await WhatsAppService.sendButtonMessage(
      from,
      'What would you like to do?',
      [
        { id: 'checkout_now', title: '✅ Checkout Now' },
        { id: 'apply_discount', title: '🎟️ Apply Code' },
        { id: 'clear_cart', title: '🗑️ Clear Cart' },
      ]
    );

    // Store in conversation history
    const conversationKey = `conversation_${waId}`;
    const existing = await state.get<{
      messages: Array<{ role: string; content: string; timestamp: string }>;
    }>('shopflow', conversationKey);

    if (existing) {
      existing.messages.push({
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString(),
      });
      await state.set('shopflow', conversationKey, existing);
    }

    await emit({
      topic: 'shopflow.response.sent',
      data: { waId, responseType: 'cart_recovery', itemCount: cartData.items.length },
    });

    logger.info('Cart recovery message sent', { itemCount: cartData.items.length });
  } catch (error) {
    logger.error('Error handling cart recovery', { error: String(error) });

    await WhatsAppService.sendTextMessage(
      from,
      `Hi ${customerName}! I'm having trouble accessing your cart right now. Please try again in a moment, or I can help you find products to add! 🛍️`
    );

    await emit({
      topic: 'shopflow.response.sent',
      data: { waId, responseType: 'error' },
    });
  }
};

