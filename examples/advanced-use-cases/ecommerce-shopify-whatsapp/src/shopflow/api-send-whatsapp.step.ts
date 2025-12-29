/**
 * Send WhatsApp Message API Step
 * Allows sending WhatsApp messages directly via API
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { errorHandlerMiddleware } from '../middlewares/error-handler.middleware';
import { WhatsAppService } from '../services/whatsapp.service';

const bodySchema = z.object({
  to: z.string().min(10, 'Phone number is required'),
  type: z.enum(['text', 'template', 'button']).default('text'),
  text: z.string().optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  buttons: z.array(z.object({
    id: z.string(),
    title: z.string(),
  })).optional(),
});

const responseSchema = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'SendWhatsAppMessage',
  description: 'Sends a WhatsApp message to a customer',
  path: '/whatsapp/send',
  method: 'POST',
  emits: [
    { topic: 'shopflow.message.sent', label: 'Message Sent' },
  ],
  flows: ['shopflow'],
  middleware: [errorHandlerMiddleware],
  bodySchema,
  responseSchema: {
    200: responseSchema,
    400: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['SendWhatsAppMessage'] = async (req, { emit, logger }) => {
  const body = bodySchema.parse(req.body);

  logger.info('Sending WhatsApp message', { 
    to: body.to, 
    type: body.type 
  });

  try {
    let result;

    switch (body.type) {
      case 'text':
        if (!body.text) {
          return {
            status: 400,
            body: { error: 'Text content is required for text messages' },
          };
        }
        result = await WhatsAppService.sendTextMessage(body.to, body.text);
        break;

      case 'template':
        if (!body.templateName) {
          return {
            status: 400,
            body: { error: 'Template name is required for template messages' },
          };
        }
        result = await WhatsAppService.sendTemplateMessage(
          body.to,
          body.templateName,
          body.templateLanguage || 'en_US'
        );
        break;

      case 'button':
        if (!body.text || !body.buttons || body.buttons.length === 0) {
          return {
            status: 400,
            body: { error: 'Text and buttons are required for button messages' },
          };
        }
        result = await WhatsAppService.sendButtonMessage(body.to, body.text, body.buttons);
        break;

      default:
        return {
          status: 400,
          body: { error: 'Invalid message type' },
        };
    }

    const messageId = result.messages?.[0]?.id;

    await emit({
      topic: 'shopflow.message.sent',
      data: {
        to: body.to,
        type: body.type,
        messageId,
      },
    });

    logger.info('WhatsApp message sent', { messageId });

    return {
      status: 200,
      body: {
        success: true,
        messageId,
      },
    };
  } catch (error) {
    logger.error('Error sending WhatsApp message', { error: String(error) });
    return {
      status: 500,
      body: { error: `Failed to send message: ${String(error)}` },
    };
  }
};

