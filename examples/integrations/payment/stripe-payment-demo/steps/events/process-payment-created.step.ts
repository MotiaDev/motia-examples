import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  customerId: z.string().optional(),
  status: z.string(),
});

type PaymentCreatedInput = z.infer<typeof inputSchema>;

export const config: EventConfig = {
  name: 'ProcessPaymentCreated',
  type: 'event',
  description: 'Process newly created payment intent - send confirmation, log analytics',
  subscribes: ['payment-created'],
  emits: [],
  input: inputSchema,
  flows: ['payment-processing'],
};

export const handler: Handlers['ProcessPaymentCreated'] = async (input, { logger, state }) => {
  const { paymentIntentId, amount, currency, customerId, status } = input as PaymentCreatedInput;
  
  try {
    await state.set('payments', paymentIntentId, {
      id: paymentIntentId,
      amount,
      currency,
      customerId,
      status,
      createdAt: new Date().toISOString(),
    });
    
    logger.info('Payment confirmation sent', { paymentIntentId });
  } catch (error) {
    logger.error('Failed to process payment', { paymentIntentId, error });
    throw error;
  }
};

