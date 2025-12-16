/**
 * Weekly Summary Cron Step
 * Generates and sends weekly summary report to Slack
 */
import { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  name: 'WeeklySummary',
  type: 'cron',
  description: 'Generates weekly prospect research summary report',
  cron: '0 9 * * 1',
  emits: [],
  flows: ['monitoring', 'notifications'],
}

export const handler: Handlers['WeeklySummary'] = async ({ logger, state }) => {
  logger.info('Generating weekly summary report')

  const allResults = await state.getGroup<any>('research_results')
  
  const completedResults = allResults.filter((r: any) => r.status === 'completed')
  const scores = completedResults.filter((r: any) => r.fit_score).map((r: any) => r.fit_score)
  
  const totalProspects = allResults.length
  const completedResearch = completedResults.length
  const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0
  const highScoreCount = scores.filter((s: number) => s >= 80).length

  const topProspects = completedResults
    .sort((a: any, b: any) => (b.fit_score || 0) - (a.fit_score || 0))
    .slice(0, 5)
    .map((r: any) => ({ company_name: r.prospect?.company_name || 'Unknown', fit_score: r.fit_score || 0 }))

  logger.info('Weekly summary stats', { totalProspects, completedResearch, avgScore, highScoreCount })

  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    logger.warn('SLACK_WEBHOOK_URL not configured')
    return
  }

  const topText = topProspects.length > 0
    ? topProspects.map((p: any, i: number) => `${i + 1}. ${p.company_name} (${p.fit_score})`).join('\n')
    : 'No prospects researched yet'

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '📊 Weekly ProspectAI Summary',
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '📊 Weekly ProspectAI Summary', emoji: true } },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Total Prospects:*\n${totalProspects}` },
              { type: 'mrkdwn', text: `*Completed:*\n${completedResearch}` },
              { type: 'mrkdwn', text: `*Avg Score:*\n${avgScore.toFixed(1)}` },
              { type: 'mrkdwn', text: `*High Score (80+):*\n${highScoreCount}` },
            ],
          },
          { type: 'section', text: { type: 'mrkdwn', text: `*Top 5 Prospects:*\n${topText}` } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `Report generated: ${new Date().toLocaleString()}` }] },
        ],
      }),
    })

    if (response.ok) {
      logger.info('Weekly summary sent to Slack')
    } else {
      logger.warn('Failed to send weekly summary')
    }
  } catch (error: any) {
    logger.warn('Slack send failed', { error: error.message })
  }
}
