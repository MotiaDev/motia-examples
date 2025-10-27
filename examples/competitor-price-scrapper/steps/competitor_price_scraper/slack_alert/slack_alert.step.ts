import { z } from 'zod'
import { EventConfig, Handlers } from 'motia'

// Input schema
const inputSchema = z.object({
  type: z.enum(['WORKFLOW_ERROR', 'WARNING']),
  payload: z.object({
    step: z.string(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.string()
  })
})

export const config: EventConfig = {
  type: 'event',
  name: 'SlackAlert',
  description: 'Sends error notifications to Slack',
  subscribes: ['slack-alert'],
  emits: [],
  input: inputSchema,
  flows: ['competitor-price-scraper']
}

export const handler: Handlers['SlackAlert'] = async (input, { logger, state }) => {
  try {
    // Import Slack helper
    const { sendSlackMessage } = await import('../../../lib/slack')

    const { type, payload } = input
    const channel = '#alerts'

    // Format message based on alert type
    let message = ''
    let color = ''

    if (type === 'WORKFLOW_ERROR') {
      color = 'danger'
      message = `🚨 *Competitor Price Scraper Error*\n` +
        `*Step:* ${payload.step}\n` +
        `*Error:* ${payload.error || 'Unknown error'}\n` +
        `*Time:* ${payload.timestamp}`
    } else if (type === 'WARNING') {
      color = 'warning'
      message = `⚠️ *Competitor Price Scraper Warning*\n` +
        `*Step:* ${payload.step}\n` +
        `*Message:* ${payload.message || payload.error || 'Unknown warning'}\n` +
        `*Time:* ${payload.timestamp}`
    }

    logger.info('Sending Slack alert', {
      type,
      channel,
      step: payload.step
    })

    // Send Slack message with formatted attachment
    const result = await sendSlackMessage({
      channel,
      text: message,
      attachments: [{
        color,
        fields: [
          {
            title: 'Workflow',
            value: 'Competitor Price Scraper',
            short: true
          },
          {
            title: 'Failed Step',
            value: payload.step,
            short: true
          },
          {
            title: 'Error Details',
            value: payload.error || payload.message || 'No additional details',
            short: false
          }
        ],
        footer: 'Motia Workflow',
        ts: Math.floor(Date.now() / 1000).toString()
      }]
    })

    logger.info('Slack alert sent successfully', {
      messageId: result.messageId
    })

    // Store alert in state for tracking
    const alerts = (await state.get('competitor-scraper', 'alerts') as any[]) || []
    alerts.push({
      type,
      payload,
      sentAt: new Date().toISOString(),
      messageId: result.messageId
    })
    await state.set('competitor-scraper', 'alerts', alerts)
  } catch (error) {
    // Log error but don't throw - we don't want alert failures to break the workflow
    logger.error('Failed to send Slack alert', { 
      error,
      originalAlert: input 
    })
  }
}