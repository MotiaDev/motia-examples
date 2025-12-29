/**
 * Products API Step
 * REST API for Shopify product management
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { errorHandlerMiddleware } from '../middlewares/error-handler.middleware';
import { ShopifyService } from '../services/shopify.service';

const productResponseSchema = z.object({
  products: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    handle: z.string(),
    productType: z.string(),
    status: z.string(),
    totalInventory: z.number(),
    price: z.string(),
    imageUrl: z.string().optional(),
  })),
  count: z.number(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetProducts',
  description: 'Retrieves products from Shopify',
  path: '/shopify/products',
  method: 'GET',
  emits: [],
  flows: ['shopflow'],
  middleware: [errorHandlerMiddleware],
  queryParams: [
    { name: 'limit', description: 'Number of products to return (default: 10)' },
    { name: 'query', description: 'Search query for products' },
  ],
  responseSchema: {
    200: productResponseSchema,
    500: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['GetProducts'] = async (req, { logger }) => {
  const limit = parseInt(req.queryParams.limit as string) || 10;
  const query = req.queryParams.query as string | undefined;

  logger.info('Fetching products from Shopify', { limit, query });

  try {
    const products = await ShopifyService.getProducts(limit, query);

    const formattedProducts = products.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description || undefined,
      handle: p.handle,
      productType: p.productType,
      status: p.status,
      totalInventory: p.totalInventory,
      price: p.priceRange.minVariantPrice.amount,
      imageUrl: p.featuredImage?.url,
    }));

    return {
      status: 200,
      body: {
        products: formattedProducts,
        count: formattedProducts.length,
      },
    };
  } catch (error) {
    logger.error('Error fetching products', { error: String(error) });
    return {
      status: 500,
      body: { error: 'Failed to fetch products' },
    };
  }
};

