/**
 * Daily News Monitor Cron Step
 * Monitors news for high-value prospects and triggers alerts
 */
import { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  name: 'DailyNewsMonitor',
  type: 'cron',
  description: 'Monitors news for top prospects daily and sends alerts for significant updates',
  cron: '0 8 * * *',
  emits: ['prospect.news.alert'],
  flows: ['monitoring'],
}

// Inline news fetch
async function fetchNews(companyName: string, domain: string): Promise<any[]> {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) return []

  try {
    const query = [companyName, domain.replace(/\.(com|io|ai|dev)$/, '')].join(' OR ')
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=5&language=en`,
      { headers: { 'X-Api-Key': apiKey } }
    )
    if (!response.ok) return []
    const data = await response.json()
    return data.articles?.map((a: any) => ({
      title: a.title, description: a.description || '', url: a.url,
      source: a.source.name, published_at: a.publishedAt,
      sentiment: a.title.toLowerCase().match(/growth|success|launch|funding/) ? 'positive' : 'neutral',
    })) || []
  } catch {
    return []
  }
}

export const handler: Handlers['DailyNewsMonitor'] = async ({ logger, emit, state }) => {
  logger.info('Starting daily news monitoring')

  const allResults = await state.getGroup<any>('research_results')
  const topProspects = allResults
    .filter((r: any) => r.status === 'completed' && r.fit_score >= 70)
    .sort((a: any, b: any) => b.fit_score - a.fit_score)
    .slice(0, 20)

  logger.info('Monitoring prospects for news', { count: topProspects.length })

  let alertsSent = 0

  for (const prospect of topProspects) {
    try {
      const p = prospect.prospect
      if (!p) continue

      const newsItems = await fetchNews(p.company_name, p.domain)
      
      const significantNews = newsItems.filter(item => {
        const pubDate = new Date(item.published_at)
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        return item.sentiment === 'positive' && pubDate > dayAgo
      })

      if (significantNews.length > 0) {
        logger.info('Significant news found', { company: p.company_name, count: significantNews.length })

        await emit({
          topic: 'prospect.news.alert',
          data: {
            prospect_id: prospect.prospect_id || prospect.id,
            company_name: p.company_name,
            fit_score: prospect.fit_score,
            news_items: significantNews,
            detected_at: new Date().toISOString(),
          },
        })
        alertsSent++
      }
    } catch (error: any) {
      logger.warn('News check failed', { error: error.message })
    }

    await new Promise(r => setTimeout(r, 500))
  }

  logger.info('Daily news monitoring complete', { prospectsChecked: topProspects.length, alertsSent })
}
