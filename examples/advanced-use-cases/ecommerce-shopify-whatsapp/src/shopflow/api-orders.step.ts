/**
 * Orders API Step
 * REST API for Shopify order management
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { errorHandlerMiddleware } from '../middlewares/error-handler.middleware';
import { ShopifyService } from '../services/shopify.service';

const orderResponseSchema = z.object({
  orders: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    createdAt: z.string(),
    financialStatus: z.string(),
    fulfillmentStatus: z.string(),
    totalPrice: z.string(),
    itemCount: z.number(),
    trackingNumbers: z.array(z.string()),
  })),
  count: z.number(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetOrders',
  description: 'Retrieves orders from Shopify',
  path: '/shopify/orders',
  method: 'GET',
  emits: [],
  flows: ['shopflow'],
  middleware: [errorHandlerMiddleware],
  queryParams: [
    { name: 'limit', description: 'Number of orders to return (default: 10)' },
    { name: 'query', description: 'Search query for orders' },
    { name: 'email', description: 'Filter by customer email' },
    { name: 'phone', description: 'Filter by customer phone' },
  ],
  responseSchema: {
    200: orderResponseSchema,
    500: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['GetOrders'] = async (req, { logger }) => {
  const limit = parseInt(req.queryParams.limit as string) || 10;
  const query = req.queryParams.query as string | undefined;
  const email = req.queryParams.email as string | undefined;
  const phone = req.queryParams.phone as string | undefined;

  logger.info('Fetching orders from Shopify', { limit, query, email, phone });

  try {
    let orders;

    if (email) {
      orders = await ShopifyService.getOrdersByEmail(email);
    } else if (phone) {
      orders = await ShopifyService.getOrdersByPhone(phone);
    } else {
      orders = await ShopifyService.getOrders(limit, query);
    }

    const formattedOrders = orders.map(o => ({
      id: o.id,
      name: o.name,
      email: o.email,
      phone: o.phone,
      createdAt: o.createdAt,
      financialStatus: o.displayFinancialStatus,
      fulfillmentStatus: o.displayFulfillmentStatus,
      totalPrice: o.totalPrice,
      itemCount: o.lineItems.edges.length,
      trackingNumbers: o.fulfillments.flatMap(f => f.trackingInfo.map(t => t.number)),
    }));

    return {
      status: 200,
      body: {
        orders: formattedOrders,
        count: formattedOrders.length,
      },
    };
  } catch (error) {
    logger.error('Error fetching orders', { error: String(error) });
    return {
      status: 500,
      body: { error: 'Failed to fetch orders' },
    };
  }
};

