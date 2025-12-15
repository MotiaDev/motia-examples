import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Notification Sent Logger Event Step
 *
 * Final step in the notification workflow.
 * Logs all sent notifications for debugging and metrics.
 * Demonstrates workflow chaining in Motia.
 */

const inputSchema = z.object({
  todoId: z.string(),
  channels: z.array(z.string()),
  sentAt: z.string(),
  message: z.string().optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'NotificationSentLogger',
  description: 'Logs notification delivery for auditing and metrics',
  subscribes: ['notification-sent'],
  flows: ['todo-app'],
  input: inputSchema,
  emits: [],
}

export const handler: Handlers['NotificationSentLogger'] = async (input, { logger, state }) => {
  const { todoId, channels, sentAt, message } = input

  logger.info('Logging notification delivery', { todoId, channels, sentAt })

  // Store notification log
  const logEntry = {
    todoId,
    channels,
    sentAt,
    message,
    loggedAt: new Date().toISOString(),
  }

  const logKey = `notification-${todoId}-${Date.now()}`
  await state.set('notification-logs', logKey, logEntry)

  // Update notification metrics
  const metricsKey = 'notification-metrics'
  const todayKey = new Date().toISOString().split('T')[0]

  const existingMetrics = await state.get<Record<string, number>>('notification-aggregates', `${metricsKey}-${todayKey}`)

  const metrics = existingMetrics ?? {
    total: 0,
    email: 0,
    push: 0,
    sms: 0,
    'in-app': 0,
  }

  metrics.total++
  for (const channel of channels) {
    if (channel in metrics) {
      metrics[channel]++
    }
  }

  await state.set('notification-aggregates', `${metricsKey}-${todayKey}`, metrics)

  logger.info('Notification logged successfully', {
    todoId,
    channelCount: channels.length,
    dailyTotal: metrics.total,
  })
}

