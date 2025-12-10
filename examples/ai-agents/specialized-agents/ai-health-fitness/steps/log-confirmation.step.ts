import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'log-confirmation',
  description: 'Send WhatsApp confirmation after activity log',
  subscribes: ['user-activity-log'],
  emits: ['send-whatsapp-message-request'], 
  input: z.object({
    user: z.string()
  }),
  flows: ['health-companion']
}

export const handler: Handlers['log-confirmation'] = async (input, { emit, logger }) => {
  const { user } = input

  await emit({
    topic: 'send-whatsapp-message-request',
    data: {
      user,
      message: 'Activity logged!'
    }
  })

  logger.info(`Emitted WhatsApp confirmation for ${user}`)
}
