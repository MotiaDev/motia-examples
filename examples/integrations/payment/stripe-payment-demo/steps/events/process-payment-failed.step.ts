import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  customerId: z.string().optional(),
  errorMessage: z.string().optional(),
});

export const config: EventConfig = {
  name: 'ProcessPaymentFailed',
  type: 'event',
  description: 'Process failed payment - notify customer, log error, trigger retry logic',
  subscribes: ['payment-failed'],
  emits: [],
  input: inputSchema,
  flows: ['payment-processing'],
};

export const handler: Handlers['ProcessPaymentFailed'] = async (input, { logger, state }) => {
  const { paymentIntentId, amount, currency, customerId, errorMessage } = input;
  
  try {
    const existingPayment = await state.get('payments', paymentIntentId);
    
    await state.set('payments', paymentIntentId, {
      id: paymentIntentId,
      amount,
      currency,
      customerId,
      status: 'failed',
      failedAt: new Date().toISOString(),
      errorMessage,
      createdAt: existingPayment?.createdAt || new Date().toISOString(),
    });
    
    logger.warn('Payment failed', { paymentIntentId, errorMessage });
  } catch (error) {
    logger.error('Failed to process payment', { paymentIntentId, error });
    throw error;
  }
};

