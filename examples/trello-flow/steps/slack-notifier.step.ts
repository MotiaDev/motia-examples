import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { SlackService } from '../services/slack.service'

const inputSchema = z.object({
  channel: z.string(),
  message: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'Slack Notifier',
  description: 'Sends notifications to Slack channels',
  subscribes: ['notify.slack'],
  emits: [],
  input: inputSchema,
  flows: ['trello'],
}

export const handler: Handlers['Slack Notifier'] = async (notification, { logger }) => {
  const { appConfig } = await import('../config/default')
  logger.info('Sending notification to Slack', { notification })
  const slack = new SlackService(appConfig.slack.webhookUrl, logger)
  await slack.sendMessage(notification.channel, notification.message)
}
