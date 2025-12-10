import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
  priceId: z.string().optional(),
  amount: z.number().min(50).optional(),
  currency: z.string().length(3).default('usd'),
  productName: z.string().default('Premium Plan'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const config: ApiRouteConfig = {
  name: 'CreateCheckoutSession',
  type: 'api',
  description: 'Create a Stripe Checkout session for hosted payment page',
  path: '/create-checkout-session',
  method: 'POST',
  emits: ['checkout-session-created'],
  flows: ['payment-processing'],
  bodySchema,
  responseSchema: {
    200: z.object({
      url: z.string(),
      sessionId: z.string(),
    }),
    400: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['CreateCheckoutSession'] = async (req, { emit, logger }) => {
  try {
    const data = bodySchema.parse(req.body);
    
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'] || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    
    const demoSessionId = `cs_test_${Math.random().toString(36).substring(7)}`;
    
    await emit({
      topic: 'checkout-session-created',
      data: {
        sessionId: demoSessionId,
        amount: data.amount || 2999,
        currency: data.currency,
        productName: data.productName,
      },
    });

    logger.info('Checkout session created', { sessionId: demoSessionId });

    return {
      status: 200,
      body: {
        url: `${baseUrl}/demo-checkout?session=${demoSessionId}`,
        sessionId: demoSessionId,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        body: { error: error.errors.map(e => e.message).join(', ') },
      };
    }
    
    logger.error('Checkout creation failed', { error });
    return {
      status: 500,
      body: { error: 'Failed to create checkout session' },
    };
  }
};

