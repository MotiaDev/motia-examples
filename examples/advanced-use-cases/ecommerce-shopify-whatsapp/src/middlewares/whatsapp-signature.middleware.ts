/**
 * WhatsApp Signature Verification Middleware
 * Verifies incoming webhook requests are from Meta/WhatsApp
 */

import { ApiMiddleware } from 'motia';
import { createHmac } from 'crypto';

const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

export const whatsappSignatureMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger } = ctx;

  // Skip verification in development or if no secret configured
  if (!APP_SECRET || process.env.NODE_ENV === 'development') {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'] as string | undefined;

  if (!signature) {
    logger.warn('Missing WhatsApp signature header');
    return {
      status: 401,
      body: { error: 'Missing signature' },
    };
  }

  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = `sha256=${createHmac('sha256', APP_SECRET)
      .update(rawBody)
      .digest('hex')}`;

    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      throw new Error('Signature length mismatch');
    }

    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    if (mismatch !== 0) {
      throw new Error('Signature mismatch');
    }

    return next();
  } catch (error) {
    logger.warn('WhatsApp signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: 401,
      body: { error: 'Invalid signature' },
    };
  }
};

