import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Todo Created Notification Event Step
 *
 * Background job that handles notifications when a new todo is created.
 * This could send:
 * - Email notifications
 * - Push notifications
 * - Slack/Discord messages
 * - SMS alerts for high priority todos
 */

const inputSchema = z.object({
  todoId: z.string(),
  title: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
})

export const config: EventConfig = {
  type: 'event',
  name: 'TodoCreatedNotification',
  description: 'Sends notifications when a new todo is created',
  subscribes: ['todo-created'],
  flows: ['todo-app'],
  input: inputSchema,
  emits: [{ topic: 'notification-sent', label: 'Notification Sent' }],
}

export const handler: Handlers['TodoCreatedNotification'] = async (input, { emit, logger, state }) => {
  const { todoId, title, priority } = input

  logger.info('Processing todo created notification', { todoId, title, priority })

  // Simulate notification logic based on priority
  const notificationChannels: string[] = []

  if (priority === 'high') {
    // High priority: send to all channels
    notificationChannels.push('email', 'push', 'sms')
    logger.info('High priority todo - sending to all notification channels', { todoId })
  } else if (priority === 'medium') {
    // Medium priority: email and push
    notificationChannels.push('email', 'push')
    logger.info('Medium priority todo - sending email and push', { todoId })
  } else {
    // Low priority: just log it
    notificationChannels.push('in-app')
    logger.info('Low priority todo - in-app notification only', { todoId })
  }

  // Store notification history in state for auditing
  await state.set('notification-history', todoId, {
    todoId,
    title,
    channels: notificationChannels,
    sentAt: new Date().toISOString(),
    type: 'todo-created',
  })

  // Simulate async notification sending (in production, this would call external services)
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Emit event that notification was sent (for further processing or auditing)
  await emit({
    topic: 'notification-sent',
    data: {
      todoId,
      channels: notificationChannels,
      sentAt: new Date().toISOString(),
    },
  })

  logger.info('Notification sent successfully', { todoId, channels: notificationChannels })
}

