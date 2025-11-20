import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { stripeService } from '../../src/services/stripe';

const bodySchema = z.object({
  amount: z.number().min(50),
  currency: z.string().length(3).default('usd'),
  customerId: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export const config: ApiRouteConfig = {
  name: 'CreatePayment',
  type: 'api',
  description: 'Create a new payment intent with Stripe',
  path: '/payments',
  method: 'POST',
  emits: ['payment-created'],
  flows: ['payment-processing'],
  bodySchema,
  responseSchema: {
    201: z.object({
      paymentIntentId: z.string(),
      clientSecret: z.string(),
      amount: z.number(),
      currency: z.string(),
      status: z.string(),
    }),
    400: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['CreatePayment'] = async (req, { emit, logger }) => {
  try {
    const paymentData = bodySchema.parse(req.body);
    
    logger.info('Creating payment intent', { amount: paymentData.amount });
    
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: paymentData.amount,
      currency: paymentData.currency,
      customerId: paymentData.customerId,
      description: paymentData.description,
      metadata: paymentData.metadata,
    });
    
    await emit({
      topic: 'payment-created',
      data: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customerId,
        status: paymentIntent.status,
      },
    });
    
    logger.info('Payment created', { paymentIntentId: paymentIntent.id });
    
    return {
      status: 201,
      body: {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.clientSecret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        body: { error: error.errors.map(e => e.message).join(', ') },
      };
    }
    
    logger.error('Payment creation failed', { error });
    return {
      status: 500,
      body: { error: 'Failed to create payment intent' },
    };
  }
};

