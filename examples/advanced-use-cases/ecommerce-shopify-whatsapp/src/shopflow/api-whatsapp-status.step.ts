/**
 * WhatsApp Status Check API
 * Checks if WhatsApp credentials are configured correctly
 */
import { ApiRouteConfig, Handlers } from 'motia';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'WhatsAppStatusCheck',
  description: 'Check if WhatsApp Business API credentials are configured',
  path: '/whatsapp/status',
  method: 'GET',
  flows: ['shopflow'],
  emits: [],
};

export const handler: Handlers['WhatsAppStatusCheck'] = async (req, { logger }) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';

  const status = {
    configured: !!accessToken,
    phoneNumberId,
    apiVersion,
    tokenPresent: !!accessToken,
    tokenValid: undefined as boolean | undefined,
    error: undefined as string | undefined,
  };

  // If token is present, validate it
  if (accessToken) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        status.tokenValid = true;
      } else {
        const data = await response.json();
        status.tokenValid = false;
        status.error = data.error?.message || 'Token validation failed';
      }
    } catch (err) {
      status.tokenValid = false;
      status.error = err instanceof Error ? err.message : 'Connection error';
    }
  } else {
    status.error = 'WHATSAPP_ACCESS_TOKEN not set. Go to Meta Developer Console → API Setup → Generate access token';
  }

  logger.info('[WhatsApp Status]', status);

  return {
    status: status.tokenValid ? 200 : 400,
    body: status,
  };
};

