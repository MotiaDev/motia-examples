import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  customerId: z.string().optional(),
});

export const config: EventConfig = {
  name: 'ProcessPaymentSucceeded',
  type: 'event',
  description: 'Process successful payment - fulfill order, send receipt, update records',
  subscribes: ['payment-succeeded'],
  emits: [],
  input: inputSchema,
  flows: ['payment-processing'],
};

export const handler: Handlers['ProcessPaymentSucceeded'] = async (input, { logger, state }) => {
  const { paymentIntentId, amount, currency, customerId } = input;
  
  try {
    const existingPayment = await state.get('payments', paymentIntentId);
    
    await state.set('payments', paymentIntentId, {
      id: paymentIntentId,
      amount,
      currency,
      customerId,
      status: 'succeeded',
      succeededAt: new Date().toISOString(),
      createdAt: existingPayment?.createdAt || new Date().toISOString(),
    });
    
    logger.info('Payment fulfilled', { paymentIntentId, amount });
  } catch (error) {
    logger.error('Failed to process payment', { paymentIntentId, error });
    throw error;
  }
};

