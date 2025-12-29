/**
 * WhatsApp Webhook Verification API Step
 * Handles the GET request for webhook verification from Meta
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'shopflow_verify_token_2024';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'WhatsAppWebhookVerify',
  description: 'Verifies WhatsApp webhook subscription',
  path: '/webhooks/whatsapp',
  method: 'GET',
  emits: [],
  flows: ['shopflow'],
  queryParams: [
    { name: 'hub.mode', description: 'Webhook mode (subscribe)' },
    { name: 'hub.verify_token', description: 'Verification token' },
    { name: 'hub.challenge', description: 'Challenge string to return' },
  ],
  responseSchema: {
    200: z.string(),
    403: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['WhatsAppWebhookVerify'] = async (req, { logger }) => {
  const mode = req.queryParams['hub.mode'] as string | undefined;
  const token = req.queryParams['hub.verify_token'] as string | undefined;
  const challenge = req.queryParams['hub.challenge'] as string | undefined;

  logger.info('WhatsApp webhook verification request', { mode, hasToken: !!token });

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified successfully');
    return {
      status: 200,
      body: challenge || '',
      headers: { 'Content-Type': 'text/plain' },
    };
  }

  logger.warn('WhatsApp webhook verification failed', { mode, tokenMatch: token === VERIFY_TOKEN });
  return {
    status: 403,
    body: { error: 'Verification failed' },
  };
};

