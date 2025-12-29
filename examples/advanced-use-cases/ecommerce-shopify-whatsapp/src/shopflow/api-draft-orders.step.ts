/**
 * Draft Orders API Step
 * REST API for Shopify draft order management
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { errorHandlerMiddleware } from '../middlewares/error-handler.middleware';
import { ShopifyService } from '../services/shopify.service';

const draftOrderResponseSchema = z.object({
  draftOrders: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    totalPrice: z.string(),
    createdAt: z.string(),
    customerEmail: z.string().optional(),
    itemCount: z.number(),
  })),
  count: z.number(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ListDraftOrders',
  description: 'Lists draft orders from Shopify',
  path: '/shopify/draft-orders',
  method: 'GET',
  emits: [],
  flows: ['shopflow'],
  middleware: [errorHandlerMiddleware],
  queryParams: [
    { name: 'limit', description: 'Number of draft orders to return (default: 10)' },
  ],
  responseSchema: {
    200: draftOrderResponseSchema,
    500: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['ListDraftOrders'] = async (req, { logger }) => {
  const limit = parseInt(req.queryParams.limit as string) || 10;

  logger.info('Fetching draft orders from Shopify', { limit });

  try {
    const draftOrders = await ShopifyService.listDraftOrders(limit);

    const formattedDraftOrders = draftOrders.map(d => ({
      id: d.id,
      name: d.name,
      status: d.status,
      totalPrice: d.totalPrice,
      createdAt: d.createdAt,
      customerEmail: d.customer?.email,
      itemCount: d.lineItems.edges.length,
    }));

    return {
      status: 200,
      body: {
        draftOrders: formattedDraftOrders,
        count: formattedDraftOrders.length,
      },
    };
  } catch (error) {
    logger.error('Error fetching draft orders', { error: String(error) });
    return {
      status: 500,
      body: { error: 'Failed to fetch draft orders' },
    };
  }
};

