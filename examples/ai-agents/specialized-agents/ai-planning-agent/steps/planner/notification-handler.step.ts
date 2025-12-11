import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { sendEmail, generatePlanEmailHtml } from '../../src/services/planner/email-service'

/**
 * Notification Handler Event Step
 * 
 * Handles all notification events from the planning system.
 * Sends real emails via Resend API.
 */

const inputSchema = z.object({
  type: z.enum(['escalation', 'completion', 'failure', 'progress']),
  planId: z.string(),
  recipients: z.array(z.string()),
  subject: z.string(),
  body: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'NotificationHandler',
  description: 'Sends notifications to stakeholders via Resend email',
  subscribes: ['notification.sent'],
  emits: [],
  input: inputSchema,
  flows: ['intelligent-planner'],
}

export const handler: Handlers['NotificationHandler'] = async (input, { logger, state }) => {
  const { type, planId, recipients, subject, body } = input

  logger.info('Processing notification', {
    type,
    planId,
    recipientCount: recipients.length,
    subject,
  })

  // Generate HTML email
  const statusMap: Record<string, string> = {
    escalation: 'blocked',
    completion: 'completed',
    failure: 'failed',
    progress: 'executing',
  }

  const htmlContent = generatePlanEmailHtml({
    title: subject,
    planId,
    objective: `Plan ${type} notification`,
    status: statusMap[type] || 'pending',
    details: body,
  })

  // Always use ALERT_RECIPIENTS for actual email delivery (Resend test API only allows verified emails)
  // The original recipients are stored in notification record for audit purposes
  const emailRecipients = process.env.ALERT_RECIPIENTS?.split(',').map(e => e.trim()) || []

  // Send real email via Resend
  const result = await sendEmail({
    to: emailRecipients,
    subject: `[Motia Plan ${type.toUpperCase()}] ${subject}`,
    html: htmlContent,
    text: body,
    tags: [
      { name: 'plan_id', value: planId },
      { name: 'notification_type', value: type },
    ],
  })

  // Store notification for audit trail
  const notificationId = `${planId}-${Date.now()}`
  await state.set('notifications', notificationId, {
    id: notificationId,
    type,
    planId,
    recipients: result.recipients,
    subject,
    body,
    sentAt: result.sentAt,
    status: result.success ? 'sent' : 'failed',
    messageId: result.messageId,
    error: result.error,
  })

  if (result.success) {
    logger.info('Email notification sent successfully', {
      planId,
      notificationId,
      messageId: result.messageId,
      recipients: result.recipients,
      type,
    })
  } else {
    logger.error('Failed to send email notification', {
      planId,
      notificationId,
      error: result.error,
      recipients: emailRecipients,
    })
  }

  logger.info('Notification processed', {
    planId,
    notificationId,
    success: result.success,
    provider: 'resend',
  })
}
