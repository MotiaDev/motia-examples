import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { stripeService } from '../../src/services/stripe';

const responseSuccess = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  created: z.number(),
});

const responseError = z.object({ error: z.string() });

export const config: ApiRouteConfig = {
  name: 'GetPaymentStatus',
  type: 'api',
  description: 'Retrieve the status of a payment intent',
  path: '/payments/:paymentIntentId',
  method: 'GET',
  emits: [],
  flows: ['payment-processing'],
  responseSchema: {
    200: responseSuccess,
    404: responseError,
    500: responseError,
  },
};

export const handler: Handlers['GetPaymentStatus'] = async (req, { logger }) => {
  try {
    const { paymentIntentId } = req.pathParams;
    
    if (!paymentIntentId) {
      return {
        status: 404,
        body: { error: 'Payment intent ID is required' },
      };
    }
    
    const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId);
    
    return {
      status: 200,
      body: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: paymentIntent.created,
      },
    };
  } catch (error) {
    logger.error('Failed to retrieve payment', { error });
    return {
      status: 500,
      body: { error: 'Failed to retrieve payment status' },
    };
  }
};

