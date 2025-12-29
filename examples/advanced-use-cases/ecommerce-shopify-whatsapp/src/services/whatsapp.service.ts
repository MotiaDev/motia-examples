/**
 * WhatsApp Business API Service
 * Handles sending messages via Meta's WhatsApp Business API
 */

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '860946537111958';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';
const WHATSAPP_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}`;

// Validate token is present
function ensureToken(): string {
  if (!WHATSAPP_ACCESS_TOKEN) {
    throw new Error(
      'WHATSAPP_ACCESS_TOKEN is not set! ' +
      'Go to Meta Developer Console → API Setup → Click "Generate access token" → ' +
      'Copy and add to your .env file as WHATSAPP_ACCESS_TOKEN=your_token'
    );
  }
  return WHATSAPP_ACCESS_TOKEN;
}

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string; message_status?: string }>;
}

interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

// ============ TEXT MESSAGES ============

export async function sendTextMessage(to: string, text: string): Promise<WhatsAppMessageResponse> {
  const token = ensureToken();
  const normalizedPhone = to.replace(/[^\d]/g, '');

  const response = await fetch(`${WHATSAPP_API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'text',
      text: {
        preview_url: true,
        body: text,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as WhatsAppError;
    throw new Error(`WhatsApp API Error: ${error.error?.message || 'Unknown error'}`);
  }

  return data as WhatsAppMessageResponse;
}

// ============ TEMPLATE MESSAGES ============

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: { fallback_value: string; code: string; amount_1000: number };
  date_time?: { fallback_value: string };
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: number;
  parameters?: TemplateParameter[];
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string = 'en_US',
  components?: TemplateComponent[]
): Promise<WhatsAppMessageResponse> {
  const normalizedPhone = to.replace(/[^\d]/g, '');

  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };

  if (components && components.length > 0) {
    (body.template as Record<string, unknown>).components = components;
  }

  const token = ensureToken();
  const response = await fetch(`${WHATSAPP_API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as WhatsAppError;
    throw new Error(`WhatsApp API Error: ${error.error?.message || 'Unknown error'}`);
  }

  return data as WhatsAppMessageResponse;
}

// ============ INTERACTIVE MESSAGES ============

export interface ListSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

export async function sendListMessage(
  to: string,
  headerText: string,
  bodyText: string,
  buttonText: string,
  sections: ListSection[]
): Promise<WhatsAppMessageResponse> {
  const token = ensureToken();
  const normalizedPhone = to.replace(/[^\d]/g, '');

  const response = await fetch(`${WHATSAPP_API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: headerText },
        body: { text: bodyText },
        action: {
          button: buttonText,
          sections,
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as WhatsAppError;
    throw new Error(`WhatsApp API Error: ${error.error?.message || 'Unknown error'}`);
  }

  return data as WhatsAppMessageResponse;
}

export interface ButtonReply {
  id: string;
  title: string;
}

export async function sendButtonMessage(
  to: string,
  bodyText: string,
  buttons: ButtonReply[]
): Promise<WhatsAppMessageResponse> {
  const normalizedPhone = to.replace(/[^\d]/g, '');

  if (buttons.length > 3) {
    throw new Error('WhatsApp button messages support maximum 3 buttons');
  }

  const token = ensureToken();
  const response = await fetch(`${WHATSAPP_API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as WhatsAppError;
    throw new Error(`WhatsApp API Error: ${error.error?.message || 'Unknown error'}`);
  }

  return data as WhatsAppMessageResponse;
}

// ============ MEDIA MESSAGES ============

export async function sendImageMessage(
  to: string,
  imageUrl: string,
  caption?: string
): Promise<WhatsAppMessageResponse> {
  const token = ensureToken();
  const normalizedPhone = to.replace(/[^\d]/g, '');

  const response = await fetch(`${WHATSAPP_API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'image',
      image: {
        link: imageUrl,
        caption,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as WhatsAppError;
    throw new Error(`WhatsApp API Error: ${error.error?.message || 'Unknown error'}`);
  }

  return data as WhatsAppMessageResponse;
}

// ============ MESSAGE STATUS ============

export async function markMessageAsRead(messageId: string): Promise<boolean> {
  const token = ensureToken();
  const response = await fetch(`${WHATSAPP_API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });

  return response.ok;
}

// ============ HELPER FUNCTIONS ============

export function formatOrderStatus(message: string): string {
  // Truncate to WhatsApp's 4096 character limit for text messages
  if (message.length > 4096) {
    return message.substring(0, 4093) + '...';
  }
  return message;
}

export function formatCurrency(amount: string | number, currency: string = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num);
}

// Export service object
export const WhatsAppService = {
  sendTextMessage,
  sendTemplateMessage,
  sendListMessage,
  sendButtonMessage,
  sendImageMessage,
  markMessageAsRead,
  formatOrderStatus,
  formatCurrency,
};

export default WhatsAppService;

