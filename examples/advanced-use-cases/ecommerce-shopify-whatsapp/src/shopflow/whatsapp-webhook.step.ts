/**
 * WhatsApp Webhook API Step
 * Receives incoming messages from WhatsApp Business API and triggers the processing workflow
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

// WhatsApp webhook verification query params schema
const verifyQuerySchema = z.object({
  'hub.mode': z.string().optional(),
  'hub.verify_token': z.string().optional(),
  'hub.challenge': z.string().optional(),
});

// WhatsApp message webhook body schema
const webhookBodySchema = z.object({
  object: z.string(),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.string(),
        metadata: z.object({
          display_phone_number: z.string(),
          phone_number_id: z.string(),
        }),
        contacts: z.array(z.object({
          profile: z.object({ name: z.string() }),
          wa_id: z.string(),
        })).optional(),
        messages: z.array(z.object({
          from: z.string(),
          id: z.string(),
          timestamp: z.string(),
          type: z.string(),
          text: z.object({ body: z.string() }).optional(),
          interactive: z.object({
            type: z.string(),
            button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
            list_reply: z.object({ id: z.string(), title: z.string(), description: z.string().optional() }).optional(),
          }).optional(),
        })).optional(),
        statuses: z.array(z.object({
          id: z.string(),
          status: z.string(),
          timestamp: z.string(),
          recipient_id: z.string(),
        })).optional(),
      }),
      field: z.string(),
    })),
  })),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'WhatsAppWebhook',
  description: 'Receives WhatsApp messages and triggers ShopFlow processing',
  path: '/webhooks/whatsapp',
  method: 'POST',
  emits: [
    { topic: 'shopflow.message.received', label: 'New WhatsApp Message' },
    { topic: 'shopflow.status.updated', label: 'Message Status Update', conditional: true },
  ],
  flows: ['shopflow'],
  bodySchema: webhookBodySchema,
  responseSchema: {
    200: z.object({ success: z.boolean() }),
    400: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['WhatsAppWebhook'] = async (req, { emit, logger, state }) => {
  const body = webhookBodySchema.safeParse(req.body);

  if (!body.success) {
    logger.warn('Invalid webhook payload', { errors: body.error.errors });
    return { status: 400, body: { error: 'Invalid payload' } };
  }

  const { entry } = body.data;

  for (const entryItem of entry) {
    for (const change of entryItem.changes) {
      const { value } = change;

      // Handle message status updates
      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          await emit({
            topic: 'shopflow.status.updated',
            data: {
              messageId: status.id,
              status: status.status,
              recipientId: status.recipient_id,
              timestamp: status.timestamp,
            },
          });
          logger.info('Message status updated', { 
            messageId: status.id, 
            status: status.status 
          });
        }
        continue;
      }

      // Handle incoming messages
      if (value.messages && value.messages.length > 0 && value.contacts) {
        for (let i = 0; i < value.messages.length; i++) {
          const message = value.messages[i];
          const contact = value.contacts[i] || value.contacts[0];

          // Extract message content based on type
          let messageContent = '';
          let messageType = message.type;
          let interactiveData: { id: string; title: string } | undefined;

          if (message.type === 'text' && message.text) {
            messageContent = message.text.body;
          } else if (message.type === 'interactive' && message.interactive) {
            if (message.interactive.button_reply) {
              messageContent = message.interactive.button_reply.title;
              interactiveData = message.interactive.button_reply;
              messageType = 'button_reply';
            } else if (message.interactive.list_reply) {
              messageContent = message.interactive.list_reply.title;
              interactiveData = message.interactive.list_reply;
              messageType = 'list_reply';
            }
          }

          // Store conversation state
          const conversationKey = `conversation_${contact.wa_id}`;
          const existingConversation = await state.get<{
            messages: Array<{ role: string; content: string; timestamp: string }>;
            customerId?: string;
            lastIntent?: string;
          }>('shopflow', conversationKey);

          const conversationHistory = existingConversation?.messages || [];
          conversationHistory.push({
            role: 'user',
            content: messageContent,
            timestamp: message.timestamp,
          });

          // Keep only last 10 messages for context
          const trimmedHistory = conversationHistory.slice(-10);

          await state.set('shopflow', conversationKey, {
            messages: trimmedHistory,
            customerId: existingConversation?.customerId,
            lastIntent: existingConversation?.lastIntent,
          });

          // Emit message received event for processing
          await emit({
            topic: 'shopflow.message.received',
            data: {
              messageId: message.id,
              from: message.from,
              customerName: contact.profile.name,
              waId: contact.wa_id,
              content: messageContent,
              type: messageType,
              interactiveData,
              timestamp: message.timestamp,
              phoneNumberId: value.metadata.phone_number_id,
              conversationHistory: trimmedHistory.slice(0, -1), // Exclude current message
            },
          });

          logger.info('WhatsApp message received', {
            from: message.from,
            type: messageType,
            contentPreview: messageContent.substring(0, 50),
          });
        }
      }
    }
  }

  return { status: 200, body: { success: true } };
};

