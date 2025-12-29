/**
 * Create Draft Order API Step
 * Creates a new draft order in Shopify
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { errorHandlerMiddleware } from '../middlewares/error-handler.middleware';
import { ShopifyService } from '../services/shopify.service';

const bodySchema = z.object({
  email: z.string().email(),
  lineItems: z.array(z.object({
    variantId: z.string(),
    quantity: z.number().min(1),
  })).min(1),
  note: z.string().optional(),
  shippingAddress: z.object({
    firstName: z.string(),
    lastName: z.string(),
    address1: z.string(),
    city: z.string(),
    province: z.string(),
    country: z.string(),
    zip: z.string(),
  }).optional(),
});

const responseSchema = z.object({
  draftOrder: z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    totalPrice: z.string(),
    createdAt: z.string(),
  }),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CreateDraftOrder',
  description: 'Creates a new draft order in Shopify',
  path: '/shopify/draft-orders',
  method: 'POST',
  emits: [
    { topic: 'shopflow.draft_order.created', label: 'Draft Order Created' },
  ],
  flows: ['shopflow'],
  middleware: [errorHandlerMiddleware],
  bodySchema,
  responseSchema: {
    201: responseSchema,
    400: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['CreateDraftOrder'] = async (req, { emit, logger }) => {
  const body = bodySchema.parse(req.body);

  logger.info('Creating draft order in Shopify', { 
    email: body.email, 
    itemCount: body.lineItems.length 
  });

  try {
    const draftOrder = await ShopifyService.createDraftOrder({
      email: body.email,
      lineItems: body.lineItems,
      note: body.note,
      shippingAddress: body.shippingAddress,
    });

    await emit({
      topic: 'shopflow.draft_order.created',
      data: {
        draftOrderId: draftOrder.id,
        email: body.email,
        totalPrice: draftOrder.totalPrice,
      },
    });

    logger.info('Draft order created', { 
      draftOrderId: draftOrder.id, 
      name: draftOrder.name 
    });

    return {
      status: 201,
      body: {
        draftOrder: {
          id: draftOrder.id,
          name: draftOrder.name,
          status: draftOrder.status,
          totalPrice: draftOrder.totalPrice,
          createdAt: draftOrder.createdAt,
        },
      },
    };
  } catch (error) {
    logger.error('Error creating draft order', { error: String(error) });
    
    if (String(error).includes('userErrors')) {
      return {
        status: 400,
        body: { error: String(error) },
      };
    }
    
    return {
      status: 500,
      body: { error: 'Failed to create draft order' },
    };
  }
};

