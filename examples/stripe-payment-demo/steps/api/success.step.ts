import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

export const config: ApiRouteConfig = {
  name: 'Success',
  type: 'api',
  description: 'Payment success page',
  path: '/success',
  method: 'GET',
  emits: [],
  responseSchema: {
    200: z.any(),
  },
};

export const handler: Handlers['Success'] = async (req, { logger }) => {
  const sessionId = req.queryParams.session_id as string;
  const email = req.queryParams.email as string;
  
  // Trigger demo webhook in background
  if (sessionId && sessionId.startsWith('cs_test_')) {
    const paymentIntentId = 'pi_' + sessionId.replace('cs_test_', '');
    
    // You could emit an event here or call the webhook directly
    logger.info('Payment success', { sessionId, email });
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful!</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen">
  <div class="container mx-auto px-4 py-16 max-w-2xl">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
        <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <h1 class="text-4xl font-bold text-gray-900 mb-2">Payment Successful! 🎉</h1>
      <p class="text-xl text-gray-600">Thank you for your purchase</p>
    </div>

    <div class="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 mb-8">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Payment Details</h2>
      
      <div class="space-y-3 text-sm">
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-600">Session ID</span>
          <span class="font-mono text-gray-900">${sessionId || '-'}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-600">Email</span>
          <span class="font-mono text-gray-900">${email || '-'}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-600">Amount</span>
          <span class="font-semibold text-green-600">$29.99</span>
        </div>
        <div class="flex justify-between py-2">
          <span class="text-gray-600">Status</span>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Completed
          </span>
        </div>
      </div>

      <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p class="text-sm text-blue-900">
          <strong>✨ What happened behind the scenes:</strong>
        </p>
        <ul class="text-sm text-blue-800 mt-2 ml-4 list-disc">
          <li>Payment processed through Motia</li>
          <li>Event steps triggered for fulfillment</li>
          <li>Confirmation email sent (simulated)</li>
          <li>Analytics logged</li>
        </ul>
      </div>
    </div>

    <div class="space-y-3">
      <a 
        href="/" 
        class="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-all shadow-lg"
      >
        View in Motia Workbench →
      </a>
    </div>
  </div>

  <script>
    const sessionId = "${sessionId}";
    const email = "${email}";

    // Trigger webhook simulation for demo
    if (sessionId && sessionId.startsWith('cs_test_')) {
      fetch('/webhooks/stripe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'stripe-signature': 'demo_signature'
        },
        body: JSON.stringify({
          id: 'evt_demo_' + Date.now(),
          type: 'payment_intent.succeeded',
          created: Math.floor(Date.now() / 1000),
          data: {
            object: {
              id: 'pi_' + sessionId.replace('cs_test_', ''),
              amount: 2999,
              currency: 'usd',
              customer: email,
            }
          }
        })
      }).then(() => {
        console.log('✅ Demo webhook triggered');
      }).catch(err => {
        console.error('Failed to trigger webhook:', err);
      });
    }
  </script>
</body>
</html>`;

  return {
    status: 200,
    body: html,
  };
};

