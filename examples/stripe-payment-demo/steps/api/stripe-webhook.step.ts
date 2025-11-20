import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { stripeService } from '../../src/services/stripe';

export const config: ApiRouteConfig = {
  name: 'StripeWebhook',
  type: 'api',
  description: 'Handle Stripe webhook events for payment updates',
  path: '/webhooks/stripe',
  method: 'POST',
  emits: [
    { topic: 'payment-succeeded', label: 'Payment Succeeded' },
    { topic: 'payment-failed', label: 'Payment Failed' },
  ],
  flows: ['payment-processing'],
  responseSchema: {
    200: z.object({ received: z.boolean() }),
    400: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['StripeWebhook'] = async (req, { emit, logger }) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
    
    const event = stripeService.verifyWebhookSignature(
      JSON.stringify(req.body),
      signature || 'test_signature',
      webhookSecret
    );
    
    logger.info('Webhook received', { eventType: event.type });
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        await emit({
          topic: 'payment-succeeded',
          data: {
            paymentIntentId: event.data.object.id,
            amount: event.data.object.amount,
            currency: event.data.object.currency,
            customerId: event.data.object.customer,
          },
        });
        break;
        
      case 'payment_intent.payment_failed':
        await emit({
          topic: 'payment-failed',
          data: {
            paymentIntentId: event.data.object.id,
            amount: event.data.object.amount,
            currency: event.data.object.currency,
            customerId: event.data.object.customer,
            errorMessage: event.data.object.last_payment_error?.message,
          },
        });
        break;
    }
    
    return {
      status: 200,
      body: { received: true },
    };
  } catch (error) {
    logger.error('Webhook failed', { error });
    return {
      status: 400,
      body: { error: 'Webhook processing failed' },
    };
  }
};

