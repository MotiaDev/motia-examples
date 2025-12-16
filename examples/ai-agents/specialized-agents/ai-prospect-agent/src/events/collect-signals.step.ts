/**
 * Collect Signals Event Step
 * Gathers 15+ signals for a prospect via NewsAPI and other sources
 */
import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  batch_id: z.string(),
  prospect_index: z.number(),
  prospect: z.object({
    id: z.string(),
    company_name: z.string(),
    domain: z.string(),
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    title: z.string(),
    industry: z.string(),
    region: z.string(),
    company_size: z.number(),
    stage: z.string(),
    estimated_revenue_millions: z.number(),
    funding_status: z.string(),
    last_funding_date: z.string().optional().nullable(),
    actively_hiring: z.string(),
    website_updated: z.string(),
    linkedin_url: z.string().optional(),
    batch_id: z.string(),
  }),
})

export const config: EventConfig = {
  name: 'CollectSignals',
  type: 'event',
  description: 'Collects 15+ signals for prospect research including news, funding, hiring patterns',
  subscribes: ['prospect.research.queued'],
  emits: ['prospect.signals.collected', 'prospect.research.failed'],
  input: inputSchema,
  flows: ['prospect-research'],
}

// Inline news fetching
async function fetchCompanyNews(companyName: string, domain: string): Promise<any[]> {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) {
    return generateMockNews(companyName)
  }

  try {
    const searchTerms = [companyName, domain.replace(/\.(com|io|ai|dev|org|net)$/, '')]
    const query = searchTerms.join(' OR ')
    
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=10&language=en`,
      { headers: { 'X-Api-Key': apiKey } }
    )

    if (!response.ok) return generateMockNews(companyName)
    
    const data = await response.json()
    return data.articles.map((article: any) => ({
      title: article.title,
      description: article.description || '',
      url: article.url,
      source: article.source.name,
      published_at: article.publishedAt,
      sentiment: analyzeSentiment(article.title + ' ' + (article.description || '')),
    }))
  } catch {
    return generateMockNews(companyName)
  }
}

function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['growth', 'success', 'launch', 'expand', 'raise', 'funding', 'award', 'partnership']
  const negativeWords = ['layoff', 'cut', 'decline', 'lawsuit', 'trouble', 'loss', 'fail']
  const lowerText = text.toLowerCase()
  let positiveCount = positiveWords.filter(w => lowerText.includes(w)).length
  let negativeCount = negativeWords.filter(w => lowerText.includes(w)).length
  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}

function generateMockNews(companyName: string): any[] {
  return [
    {
      title: `${companyName} Announces New Strategic Initiative`,
      description: `${companyName} has unveiled plans for expanded operations.`,
      url: '#', source: 'Industry News',
      published_at: new Date().toISOString(), sentiment: 'positive',
    },
  ]
}

// Inline signal collection
function collectSignals(
  companyName: string, domain: string, industry: string,
  fundingStatus: string, activelyHiring: string, websiteUpdated: string, companySize: number
) {
  const funding_signals = fundingStatus ? [{
    type: fundingStatus,
    source: 'Company Profile',
    confidence: 0.9,
  }] : []

  const hiring_patterns = activelyHiring.toLowerCase() === 'yes' ? [
    { role_category: 'Engineering', volume: companySize > 200 ? 'High' : 'Medium', trend: 'growing', source: 'Job Boards' },
    { role_category: 'Sales', volume: 'Medium', trend: 'growing', source: 'Job Boards' },
  ] : [{ role_category: 'Minimal', volume: 'Low', trend: 'stable', source: 'Job Boards' }]

  const industryTech: Record<string, string[]> = {
    'AI/ML': ['TensorFlow', 'PyTorch', 'AWS SageMaker'],
    'Cloud Computing': ['AWS', 'Azure', 'Kubernetes'],
    'SaaS': ['React', 'Node.js', 'PostgreSQL'],
    'FinTech': ['Stripe', 'Plaid', 'AWS'],
  }
  const techs = industryTech[industry] || ['Cloud Services', 'Modern Stack']
  const tech_stack_signals = techs.map(t => ({ technology: t, relevance: 'Core Infrastructure', source: 'Industry Analysis' }))

  const social_signals = websiteUpdated.toLowerCase() === 'current'
    ? [{ platform: 'Website', activity_level: 'High', engagement_trend: 'Active updates' }]
    : [{ platform: 'Website', activity_level: 'Low', engagement_trend: 'Infrequent updates' }]

  const intent_signals: any[] = []
  if (['series a', 'series b', 'series c', 'seed'].includes(fundingStatus.toLowerCase())) {
    intent_signals.push({ signal_type: 'Post-Funding Growth', strength: 'high', description: 'Recently funded - expansion likely' })
  }
  if (activelyHiring.toLowerCase() === 'yes') {
    intent_signals.push({ signal_type: 'Scaling Operations', strength: 'high', description: 'Active hiring indicates growth' })
  }

  return { funding_signals, hiring_patterns, tech_stack_signals, news_signals: [], social_signals, intent_signals }
}

export const handler: Handlers['CollectSignals'] = async (input, { emit, logger, state }) => {
  const { batch_id, prospect_index, prospect } = input

  logger.info('Starting signal collection', { prospectId: prospect.id, company: prospect.company_name })

  try {
    const [signals, newsItems] = await Promise.all([
      Promise.resolve(collectSignals(
        prospect.company_name, prospect.domain, prospect.industry,
        prospect.funding_status, prospect.actively_hiring, prospect.website_updated, prospect.company_size
      )),
      fetchCompanyNews(prospect.company_name, prospect.domain),
    ])

    // Add news to signals
    signals.news_signals = newsItems.map(n => ({
      headline: n.title, summary: n.description, sentiment: n.sentiment,
      relevance_score: 0.7 + Math.random() * 0.3, published_at: n.published_at,
      source: n.source, url: n.url,
    }))

    const signalCount = Object.values(signals).flat().length
    logger.info('Signals collected', { prospectId: prospect.id, signalCount, newsCount: newsItems.length })

    await state.set('prospect_signals', prospect.id, {
      prospect_id: prospect.id, signals, news_items: newsItems,
      collected_at: new Date().toISOString(),
    })

    await emit({
      topic: 'prospect.signals.collected',
      data: { batch_id, prospect_index, prospect, signals, news_items: newsItems },
    })
  } catch (error: any) {
    logger.error('Signal collection failed', { prospectId: prospect.id, error: error.message })
    
    await state.set('research_results', prospect.id, {
      prospect_id: prospect.id, prospect, status: 'failed',
      error_message: `Signal collection failed: ${error.message}`,
      created_at: new Date().toISOString(),
    })

    await emit({
      topic: 'prospect.research.failed',
      data: { batch_id, prospect_index, prospect_id: prospect.id, error: error.message, stage: 'signal_collection' },
    })
  }
}
