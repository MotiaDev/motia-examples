/**
 * Complete Draft Order API Step
 * Completes a draft order and converts it to a regular order
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { errorHandlerMiddleware } from '../middlewares/error-handler.middleware';
import { ShopifyService } from '../services/shopify.service';

const responseSchema = z.object({
  draftOrder: z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    totalPrice: z.string(),
  }),
  message: z.string(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CompleteDraftOrder',
  description: 'Completes a draft order and converts it to a regular order',
  path: '/shopify/draft-orders/:draftOrderId/complete',
  method: 'POST',
  emits: [
    { topic: 'shopflow.order.created', label: 'Order Created from Draft' },
  ],
  flows: ['shopflow'],
  middleware: [errorHandlerMiddleware],
  responseSchema: {
    200: responseSchema,
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['CompleteDraftOrder'] = async (req, { emit, logger }) => {
  const draftOrderId = req.pathParams.draftOrderId;

  logger.info('Completing draft order', { draftOrderId });

  try {
    const result = await ShopifyService.completeDraftOrder(draftOrderId);

    await emit({
      topic: 'shopflow.order.created',
      data: {
        draftOrderId: result.draftOrder.id,
        draftOrderName: result.draftOrder.name,
        totalPrice: result.draftOrder.totalPrice,
      },
    });

    logger.info('Draft order completed', { 
      draftOrderId: result.draftOrder.id,
      name: result.draftOrder.name,
    });

    return {
      status: 200,
      body: {
        draftOrder: {
          id: result.draftOrder.id,
          name: result.draftOrder.name,
          status: result.draftOrder.status,
          totalPrice: result.draftOrder.totalPrice,
        },
        message: 'Draft order completed successfully. This is marked as PAID (accounting status only - no actual charges made).',
      },
    };
  } catch (error) {
    logger.error('Error completing draft order', { error: String(error) });
    
    if (String(error).includes('not found') || String(error).includes('does not exist')) {
      return {
        status: 404,
        body: { error: 'Draft order not found' },
      };
    }
    
    return {
      status: 500,
      body: { error: 'Failed to complete draft order' },
    };
  }
};

