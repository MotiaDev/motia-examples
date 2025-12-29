/**
 * Handle Order Status Event Step
 * Retrieves order information from Shopify and responds via WhatsApp
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { ShopifyService, ShopifyOrder } from '../services/shopify.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { GeminiService, OrderContext } from '../services/gemini.service';

const inputSchema = z.object({
  messageId: z.string(),
  from: z.string(),
  customerName: z.string(),
  waId: z.string(),
  content: z.string(),
  phoneNumberId: z.string(),
  customerId: z.string().optional().nullable(),
  entities: z.object({
    orderNumber: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    productName: z.string().optional().nullable(),
    productCategory: z.string().optional().nullable(),
    discountCode: z.string().optional().nullable(),
    amount: z.string().optional().nullable(),
  }).optional(),
  sentiment: z.string().optional(),
  confidence: z.number().optional(),
  intent: z.string().optional(),
  action: z.string().optional(),
  orderId: z.string().optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'HandleOrderStatus',
  description: 'Retrieves order status from Shopify and sends response via WhatsApp',
  subscribes: ['shopflow.intent.order_status'],
  emits: [
    { topic: 'shopflow.response.sent', label: 'Response Sent' },
    { topic: 'shopflow.escalation.required', label: 'Escalation Needed', conditional: true },
  ],
  flows: ['shopflow'],
  input: inputSchema,
};

export const handler: Handlers['HandleOrderStatus'] = async (input, { emit, logger, state, streams }) => {
  const {
    from,
    customerName,
    waId,
    entities,
    orderId,
    action,
  } = input;

  logger.info('Handling order status request', { from, entities, orderId });

  try {
    let orders: ShopifyOrder[] = [];

    // If specific order ID is provided (from button click)
    if (orderId) {
      const order = await ShopifyService.getOrderById(orderId);
      if (order) {
        orders = [order];
      }
    }
    // If order number is mentioned in message
    else if (entities?.orderNumber) {
      const orderQuery = entities.orderNumber.replace('#', '');
      orders = await ShopifyService.getOrders(5, `name:${orderQuery}`);
    }
    // Otherwise, look up orders by phone number
    else {
      orders = await ShopifyService.getOrdersByPhone(from);
    }

    // If no orders found, try by email if provided
    if (orders.length === 0 && entities?.email) {
      orders = await ShopifyService.getOrdersByEmail(entities.email);
    }

    if (orders.length === 0) {
      // No orders found - send helpful message
      const message = `Hi ${customerName}! 👋\n\nI couldn't find any orders associated with this phone number.\n\n*Here's what you can do:*\n• Reply with your order number (e.g., #1234)\n• Reply with the email you used for your order\n• Contact our support team for help`;

      await WhatsAppService.sendButtonMessage(from, message, [
        { id: 'talk_to_human', title: '💬 Talk to Human' },
      ]);

      await emit({
        topic: 'shopflow.response.sent',
        data: { waId, responseType: 'no_orders_found' },
      });
      return;
    }

    // If multiple orders, send a list to choose from
    if (orders.length > 1 && !orderId) {
      const sections = [{
        title: 'Your Recent Orders',
        rows: orders.slice(0, 10).map(order => ({
          id: `order_${order.id.replace('gid://shopify/Order/', '')}`,
          title: `Order ${order.name}`,
          description: `${order.displayFulfillmentStatus} - ${WhatsAppService.formatCurrency(order.totalPrice)}`,
        })),
      }];

      await WhatsAppService.sendListMessage(
        from,
        '📦 Your Orders',
        `Hi ${customerName}! I found ${orders.length} orders. Which one would you like to check?`,
        'View Orders',
        sections
      );

      await emit({
        topic: 'shopflow.response.sent',
        data: { waId, responseType: 'order_list', orderCount: orders.length },
      });
      return;
    }

    // Single order - generate detailed response
    const order = orders[0];
    const orderContext: OrderContext[] = [{
      orderName: order.name,
      status: order.displayFinancialStatus,
      fulfillmentStatus: order.displayFulfillmentStatus,
      totalPrice: WhatsAppService.formatCurrency(order.totalPrice),
      items: order.lineItems.edges.map(e => ({
        title: e.node.title,
        quantity: e.node.quantity,
      })),
      trackingInfo: order.fulfillments.flatMap(f => f.trackingInfo.map(t => ({
        number: t.number,
        company: t.company,
        url: t.url,
      }))),
      shippingAddress: order.shippingAddress
        ? `${order.shippingAddress.address1}, ${order.shippingAddress.city}, ${order.shippingAddress.province} ${order.shippingAddress.zip}`
        : undefined,
      createdAt: new Date(order.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    }];

    // Generate AI response
    const response = await GeminiService.generateOrderStatusResponse(customerName, orderContext);

    // Send WhatsApp message
    await WhatsAppService.sendTextMessage(from, response);

    // If there's tracking info, add quick action buttons
    if (order.fulfillments.length > 0 && order.fulfillments[0].trackingInfo.length > 0) {
      const tracking = order.fulfillments[0].trackingInfo[0];
      if (tracking.url) {
        await WhatsAppService.sendButtonMessage(
          from,
          '📦 Track your package',
          [
            { id: 'track_package', title: '🔗 Track Package' },
            { id: 'talk_to_human', title: '💬 Need Help?' },
          ]
        );
      }
    }

    // Store response in conversation history
    const conversationKey = `conversation_${waId}`;
    const existing = await state.get<{
      messages: Array<{ role: string; content: string; timestamp: string }>;
      customerId?: string;
    }>('shopflow', conversationKey);

    if (existing) {
      existing.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      });
      await state.set('shopflow', conversationKey, existing);
    }

    // Update dashboard stream
    if (streams.supportDashboard) {
      await streams.supportDashboard.set('conversations', waId, {
        id: waId,
        customerName,
        phone: from,
        lastMessage: response.substring(0, 100),
        lastIntent: 'order_status',
        status: 'resolved',
        updatedAt: new Date().toISOString(),
      });
    }

    await emit({
      topic: 'shopflow.response.sent',
      data: {
        waId,
        responseType: 'order_status',
        orderId: order.id,
        orderName: order.name,
      },
    });

    logger.info('Order status response sent', { orderId: order.id, orderName: order.name });
  } catch (error) {
    logger.error('Error handling order status', { error: String(error) });

    // Send fallback message
    await WhatsAppService.sendTextMessage(
      from,
      `Hi ${customerName}! I'm having trouble looking up your order right now. Let me connect you with our support team who can help! 🙏`
    );

    await emit({
      topic: 'shopflow.escalation.required',
      data: {
        messageId: input.messageId,
        from,
        customerName,
        waId,
        content: input.content,
        phoneNumberId: input.phoneNumberId,
        reason: `Order lookup error: ${String(error)}`,
        sentiment: 'neutral',
      },
    });
  }
};

