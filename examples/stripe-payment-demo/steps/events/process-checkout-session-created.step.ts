import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  sessionId: z.string(),
  amount: z.number(),
  currency: z.string(),
  productName: z.string(),
});

export const config: EventConfig = {
  name: 'ProcessCheckoutSessionCreated',
  type: 'event',
  description: 'Process checkout session creation - log analytics, prepare for payment',
  subscribes: ['checkout-session-created'],
  emits: [],
  input: inputSchema,
  flows: ['payment-processing'],
};

export const handler: Handlers['ProcessCheckoutSessionCreated'] = async (input, { logger, state }) => {
  const { sessionId, amount, currency, productName } = input;
  
  try {
    await state.set('checkout-sessions', sessionId, {
      id: sessionId,
      amount,
      currency,
      productName,
      status: 'created',
      createdAt: new Date().toISOString(),
    });
    
    logger.info('Checkout session created', { sessionId, amount });
  } catch (error) {
    logger.error('Failed to process checkout', { sessionId, error });
    throw error;
  }
};

