import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

export const config: ApiRouteConfig = {
  name: 'Cancel',
  type: 'api',
  description: 'Payment cancelled page',
  path: '/cancel',
  method: 'GET',
  emits: [],
  responseSchema: {
    200: z.any(),
  },
};

export const handler: Handlers['Cancel'] = async (req, { logger }) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Cancelled</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
  <div class="container mx-auto px-4 py-16 max-w-2xl">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-24 h-24 bg-yellow-100 rounded-full mb-6">
        <svg class="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>
      <h1 class="text-4xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
      <p class="text-xl text-gray-600">Your payment was not processed</p>
    </div>

    <div class="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 mb-8">
      <p class="text-gray-700 mb-6">
        No charges were made. Feel free to try again when you're ready.
      </p>
      
      <div class="space-y-3">
        <a 
          href="/"
          class="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-all shadow-lg"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    status: 200,
    body: html,
  };
};

