interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): WebhookEvent {
  try {
    return JSON.parse(payload) as WebhookEvent;
  } catch (error) {
    throw new Error('Invalid webhook payload');
  }
}

