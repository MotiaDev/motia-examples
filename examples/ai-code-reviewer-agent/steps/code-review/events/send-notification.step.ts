import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Input schema for notification delivery
 */
const inputSchema = z.object({
  reviewId: z.string(),
  repository: z.string(),
  repositoryOwner: z.string(),
  pullRequestNumber: z.number().nullable(),
  commitSha: z.string(),
  overallScore: z.number(),
  recommendation: z.enum(['approve', 'request_changes', 'comment']),
  findingsCount: z.number(),
  author: z.string().optional(),
  deliveryFailed: z.boolean().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'SendNotification',
  description: 'Sends notifications via Slack, webhooks, and updates real-time stream with final status',
  subscribes: ['review.notification'],
  emits: [],
  flows: ['code-review-pipeline'],
  input: inputSchema
}

export const handler: Handlers['SendNotification'] = async (input, { logger, state, streams }) => {
  const { reviewId, repository, pullRequestNumber, overallScore, recommendation, findingsCount, deliveryFailed } = input
  const startTime = Date.now()

  logger.info('Sending notifications', { reviewId, repository })

  try {
    // Fetch review artifacts
    const reviewContext = await state.get<any>('reviews', reviewId)
    const refinedReview = await state.get<any>('refined', reviewId)

    // Update final progress stream
    await streams.reviewProgress.set(reviewId, reviewId, {
      id: reviewId,
      reviewId,
      stage: deliveryFailed ? 'completed' : 'completed',
      message: deliveryFailed 
        ? `Review complete (GitHub delivery failed). Score: ${overallScore}/100 with ${findingsCount} findings.`
        : `Review complete! Score: ${overallScore}/100 with ${findingsCount} findings. Posted to GitHub.`,
      timestamp: new Date().toISOString(),
      metadata: {
        repository,
        pullRequest: typeof pullRequestNumber === 'number' ? pullRequestNumber : undefined,
        progress: 100,
        currentAgent: 'Complete',
        findings: findingsCount,
        score: overallScore
      }
    })

    // Send ephemeral completion event
    await streams.reviewProgress.send(
      { groupId: reviewId },
      {
        type: 'review_completed',
        data: {
          reviewId,
          score: overallScore,
          recommendation,
          findingsCount,
          deliveryFailed: deliveryFailed || false
        }
      }
    )

    // Send Slack notification if configured
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
    if (slackWebhookUrl) {
      await sendSlackNotification(slackWebhookUrl, {
        reviewId,
        repository,
        pullRequestNumber,
        overallScore,
        recommendation,
        findingsCount,
        summary: refinedReview?.executiveSummary || 'Review completed',
        highlights: refinedReview?.highlights || {}
      }, logger)
    }

    // Send custom webhook if configured
    const customWebhookUrl = process.env.REVIEW_WEBHOOK_URL
    if (customWebhookUrl) {
      await sendCustomWebhook(customWebhookUrl, {
        event: 'review.completed',
        reviewId,
        repository,
        pullRequestNumber,
        overallScore,
        recommendation,
        findingsCount,
        refinedReview,
        timestamp: new Date().toISOString()
      }, logger)
    }

    // Update final review state
    await state.set('reviews', reviewId, {
      ...reviewContext,
      status: 'completed',
      completedAt: new Date().toISOString(),
      stages: {
        ...reviewContext?.stages,
        completed: { timestamp: new Date().toISOString() }
      }
    })

    logger.info('Notifications sent successfully', {
      reviewId,
      processingTimeMs: Date.now() - startTime
    })

  } catch (error) {
    logger.error('Failed to send notifications', { reviewId, error: String(error) })
    // Don't throw - notifications are best effort
  }
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(
  webhookUrl: string,
  data: {
    reviewId: string
    repository: string
    pullRequestNumber: number | null
    overallScore: number
    recommendation: string
    findingsCount: number
    summary: string
    highlights: any
  },
  logger: any
): Promise<void> {
  const scoreEmoji = data.overallScore >= 80 ? '🟢' :
                     data.overallScore >= 60 ? '🟡' : '🔴'

  const recommendationText = {
    approve: '✅ Approved',
    request_changes: '🔄 Changes Requested',
    comment: '💬 Commented'
  }

  const payload = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🤖 AI Code Review Complete',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Repository:*\n${data.repository}`
          },
          {
            type: 'mrkdwn',
            text: `*PR:*\n${data.pullRequestNumber ? `#${data.pullRequestNumber}` : 'N/A'}`
          },
          {
            type: 'mrkdwn',
            text: `*Score:*\n${scoreEmoji} ${data.overallScore}/100`
          },
          {
            type: 'mrkdwn',
            text: `*Recommendation:*\n${recommendationText[data.recommendation as keyof typeof recommendationText] || data.recommendation}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary:*\n${data.summary}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🔴 Critical: ${data.highlights.critical || 0} | 🟠 High: ${data.highlights.high || 0} | 🟡 Medium: ${data.highlights.medium || 0} | 🔵 Low: ${data.highlights.low || 0}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Review',
              emoji: true
            },
            url: `${process.env.APP_URL || 'http://localhost:3000'}/reviews/${data.reviewId}`,
            action_id: 'view_review'
          }
        ]
      }
    ]
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      logger.warn('Slack notification failed', { status: response.status })
    } else {
      logger.info('Slack notification sent')
    }
  } catch (error) {
    logger.warn('Failed to send Slack notification', { error: String(error) })
  }
}

/**
 * Send custom webhook
 */
async function sendCustomWebhook(
  webhookUrl: string,
  data: any,
  logger: any
): Promise<void> {
  try {
    const webhookSecret = process.env.REVIEW_WEBHOOK_SECRET
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Motia-Code-Review-Bot'
    }

    if (webhookSecret) {
      const crypto = await import('crypto')
      const signature = crypto.createHmac('sha256', webhookSecret)
        .update(JSON.stringify(data))
        .digest('hex')
      headers['X-Webhook-Signature'] = `sha256=${signature}`
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      logger.warn('Custom webhook failed', { status: response.status })
    } else {
      logger.info('Custom webhook sent')
    }
  } catch (error) {
    logger.warn('Failed to send custom webhook', { error: String(error) })
  }
}

