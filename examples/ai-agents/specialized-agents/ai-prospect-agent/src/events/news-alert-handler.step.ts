/**
 * News Alert Handler Event Step
 * Processes news alerts and notifies sales team
 */
import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  prospect_id: z.string(),
  company_name: z.string(),
  fit_score: z.number(),
  news_items: z.array(z.any()),
  detected_at: z.string(),
})

export const config: EventConfig = {
  name: 'NewsAlertHandler',
  type: 'event',
  description: 'Handles news alerts for monitored prospects',
  subscribes: ['prospect.news.alert'],
  emits: [],
  input: inputSchema,
  flows: ['monitoring', 'notifications'],
}

export const handler: Handlers['NewsAlertHandler'] = async (input, { logger }) => {
  const { prospect_id, company_name, fit_score, news_items } = input

  logger.info('Processing news alert', { prospectId: prospect_id, company: company_name, newsCount: news_items.length })

  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    logger.warn('SLACK_WEBHOOK_URL not configured')
    return
  }

  const newsText = news_items
    .slice(0, 3)
    .map((n: any) => `• <${n.url}|${n.title}> (${n.source})`)
    .join('\n')

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `📰 News Alert: ${company_name}`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: `📰 News Alert: ${company_name}`, emoji: true } },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Company:*\n${company_name}` },
              { type: 'mrkdwn', text: `*Fit Score:*\n${fit_score}` },
            ],
          },
          { type: 'section', text: { type: 'mrkdwn', text: `*Recent News:*\n${newsText}` } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `This prospect is showing positive momentum. Consider reaching out!` }] },
        ],
      }),
    })

    if (response.ok) {
      logger.info('News alert sent to Slack', { prospectId: prospect_id, company: company_name })
    } else {
      logger.warn('Failed to send news alert')
    }
  } catch (error: any) {
    logger.warn('Slack send failed', { error: error.message })
  }
}
