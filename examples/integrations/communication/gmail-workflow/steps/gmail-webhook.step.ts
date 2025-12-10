import { ApiRouteConfig, StepHandler } from 'motia';
import { z } from 'zod';

const schema = z.object({
  message: z.object({
    data: z.string(),
    messageId: z.string(),
  }),
})

type MessageData = {
  emailAddress: string
  historyId: number
}


export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Webhook API',
  description: 'Receives webhook notifications from Gmail for new emails',
  path: '/api/gmail-webhook',
  method: 'POST',
  emits: [{
    topic: 'gmail.email.received',
    label: 'Email Received',
  }],
  virtualSubscribes: ['api.gmail.webhook'],
  bodySchema: schema,
  flows: ['gmail-flow'],
}

export const handler: StepHandler<typeof config> = async (req, {logger, emit}) => {
  const payload = schema.parse(req.body)

  const messageData = Buffer.from(payload.message.data, 'base64').toString('utf-8')
  const message = JSON.parse(messageData) as MessageData

  logger.info(`Received email notification: ${JSON.stringify(message)}`)
  logger.info(`Received email notification: ${JSON.stringify(payload)}`)

  await emit({
    topic: 'gmail.email.received',
    data: {messageId: payload.message.messageId, historyId: message.historyId}
  })

  return {
    status: 200,
    body: {
      message: 'Email notification received and processing initiated'
    },
  }
} 