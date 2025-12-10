import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'whatsapp-inbound-handler',
  description: 'Handles incoming WhatsApp messages via webhook',
  path: '/webhook',
  method: 'POST',
  emits: ['message-received'],
  bodySchema: z.object({
    entry: z.array(
      z.object({
        changes: z.array(
          z.object({
            value: z.object({
              messages: z
                .array(
                  z.object({
                    from: z.string(),
                    text: z.object({ body: z.string() })
                  })
                )
                .optional()
            })
          })
        )
      })
    )
  }),
  flows: ['health-companion']
}

export const handler: Handlers['whatsapp-inbound-handler'] = async (req, { emit, logger }) => {
  const body = req.body
  let messages: { from: string, text: { body: string } }[] = [];
  try {
    messages =
      body.entry
        ?.flatMap((entry: any) =>
          entry.changes?.flatMap((change: any) =>
            change.value.messages ?? []
          ) ?? []
        ) ?? [];
  } catch (e) {
    logger.error('Failed to extract WhatsApp messages from webhook body', { body, error: e });
  }

  if (!messages.length) {
  logger.info('No WhatsApp messages in incoming webhook payload (non-user event)', { body });
  return {
    status: 200,
    body: { message: 'No user message to process' }
    }
  }


  // Emit one event per message received
  for (const msg of messages) {
    const user = msg.from;
    const message = msg.text?.body;

    if (!user || !message) {
      logger.error('Malformed WhatsApp message - missing user or text body', { msg });
      continue;
    }

    logger.info('Emitting WhatsApp message-received event', { user, message });
    await emit({
      topic: 'message-received',
      data: { user, message } 
    });
  }

  return {
    status: 200,
    body: { message: 'Webhook processed successfully' }
  }
}
