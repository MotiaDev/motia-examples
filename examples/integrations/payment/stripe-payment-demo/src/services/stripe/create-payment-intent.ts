interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  clientSecret: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  created: number;
}

export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
  const paymentIntent: PaymentIntent = {
    id: `pi_${Math.random().toString(36).substring(7)}`,
    amount: params.amount,
    currency: params.currency,
    status: 'requires_payment_method',
    clientSecret: `pi_${Math.random().toString(36).substring(7)}_secret_${Math.random().toString(36).substring(7)}`,
    customerId: params.customerId,
    description: params.description,
    metadata: params.metadata,
    created: Math.floor(Date.now() / 1000),
  };
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return paymentIntent;
}

