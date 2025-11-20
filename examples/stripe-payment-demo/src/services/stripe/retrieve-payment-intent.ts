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

export async function retrievePaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
  const paymentIntent: PaymentIntent = {
    id: paymentIntentId,
    amount: 2999,
    currency: 'usd',
    status: 'succeeded',
    clientSecret: `${paymentIntentId}_secret_${Math.random().toString(36).substring(7)}`,
    description: 'Demo payment',
    created: Math.floor(Date.now() / 1000),
  };
  
  await new Promise(resolve => setTimeout(resolve, 50));
  
  return paymentIntent;
}

