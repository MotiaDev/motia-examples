/**
 * Notify Slack Event Step
 * Sends real-time Slack alerts when prospects are researched
 */
import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

// Define schema inline per Motia pattern
const inputSchema = z.object({
  batch_id: z.string(),
  prospect_index: z.number(),
  prospect_id: z.string(),
  company_name: z.string(),
  contact_name: z.string(),
  fit_score: z.number(),
  buying_intent_score: z.number(),
  key_insight: z.string(),
  industry: z.string(),
})

export const config: EventConfig = {
  name: 'NotifySlack',
  type: 'event',
  description: 'Sends Slack notification when prospect research is completed',
  subscribes: ['prospect.research.completed'],
  emits: [],
  input: inputSchema,
  flows: ['prospect-research', 'notifications'],
}

export const handler: Handlers['NotifySlack'] = async (input, { logger }) => {
  const { prospect_id, company_name, contact_name, fit_score, industry, key_insight } = input

  logger.info('Sending Slack notification', { prospectId: prospect_id, company: company_name, fitScore: fit_score })

  const SCORE_THRESHOLD = parseInt(process.env.SLACK_NOTIFICATION_THRESHOLD || '70')

  if (fit_score < SCORE_THRESHOLD) {
    logger.info('Skipping Slack - score below threshold', { fitScore: fit_score, threshold: SCORE_THRESHOLD })
    return
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    logger.warn('SLACK_WEBHOOK_URL not configured')
    return
  }

  const scoreEmoji = fit_score >= 80 ? '🔥' : fit_score >= 60 ? '✅' : '📊'

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${scoreEmoji} New prospect researched: ${company_name}, ${fit_score} fit score`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: `${scoreEmoji} New Prospect Researched`, emoji: true } },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Company:*\n${company_name}` },
              { type: 'mrkdwn', text: `*Fit Score:*\n${fit_score}/100` },
              { type: 'mrkdwn', text: `*Contact:*\n${contact_name}` },
              { type: 'mrkdwn', text: `*Industry:*\n${industry}` },
            ],
          },
          { type: 'section', text: { type: 'mrkdwn', text: `*Key Insight:*\n${key_insight}` } },
          { type: 'divider' },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `ProspectAI Research Complete • ${new Date().toLocaleString()}` }] },
        ],
      }),
    })

    if (response.ok) {
      logger.info('Slack notification sent', { prospectId: prospect_id, company: company_name })
    } else {
      logger.warn('Slack notification failed', { status: response.status })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.warn('Failed to send Slack notification', { error: errorMessage })
  }
}
