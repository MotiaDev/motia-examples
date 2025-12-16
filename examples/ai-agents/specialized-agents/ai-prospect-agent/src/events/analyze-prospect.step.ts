/**
 * Analyze Prospect Event Step
 * Uses Gemini/Claude to analyze signals and generate fit score
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
  signals: z.any(),
  news_items: z.array(z.any()),
})

export const config: EventConfig = {
  name: 'AnalyzeProspect',
  type: 'event',
  description: 'AI-powered analysis to generate fit score and buying intent',
  subscribes: ['prospect.signals.collected'],
  emits: ['prospect.analyzed', 'prospect.research.failed'],
  input: inputSchema,
  flows: ['prospect-research'],
}

// Inline AI analysis
async function analyzeWithAI(prospect: any, signals: any, newsItems: any[]): Promise<any> {
  const geminiKey = process.env.GEMINI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  
  const prompt = `You are a sales intelligence AI analyzing a prospect for B2B sales outreach.

## Prospect Information
- Company: ${prospect.company_name}
- Domain: ${prospect.domain}
- Industry: ${prospect.industry}
- Region: ${prospect.region}
- Company Size: ${prospect.company_size} employees
- Stage: ${prospect.stage}
- Estimated Revenue: $${prospect.estimated_revenue_millions}M
- Funding Status: ${prospect.funding_status}
- Actively Hiring: ${prospect.actively_hiring}

## Contact
- Name: ${prospect.first_name} ${prospect.last_name}
- Title: ${prospect.title}

## Signals
${JSON.stringify(signals, null, 2)}

## News
${newsItems.map(n => `- ${n.title} (${n.sentiment})`).join('\n')}

Analyze and respond in JSON:
{
  "fitScore": number 0-100,
  "fitReasoning": "string",
  "buyingIntentScore": number 0-100,
  "growthIndicators": [{"metric": "string", "value": "string", "trend": "up|stable|down", "period": "string"}],
  "keyInsights": ["string"],
  "riskFactors": ["string"],
  "recommendedApproach": "string"
}`

  try {
    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
    }
    
    if (anthropicKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('AI API error:', e)
  }

  // Fallback heuristic analysis
  return generateHeuristicAnalysis(prospect, signals)
}

function generateHeuristicAnalysis(prospect: any, signals: any) {
  let fitScore = 50
  const keyInsights: string[] = []
  const growthIndicators: any[] = []
  
  // Score based on signals
  if (signals.funding_signals?.length > 0) {
    fitScore += 15
    keyInsights.push(`Recently ${signals.funding_signals[0].type} - growth phase`)
  }
  if (signals.hiring_patterns?.some((h: any) => h.trend === 'growing')) {
    fitScore += 10
    keyInsights.push('Active hiring indicates expansion')
  }
  if (prospect.company_size >= 50 && prospect.company_size <= 500) {
    fitScore += 10
    keyInsights.push('Mid-market company - ideal target size')
  }
  if (prospect.actively_hiring?.toLowerCase() === 'yes') {
    fitScore += 5
    growthIndicators.push({ metric: 'Hiring', value: 'Active', trend: 'up', period: 'Current' })
  }
  if (signals.intent_signals?.some((i: any) => i.strength === 'high')) {
    fitScore += 10
  }

  fitScore = Math.min(100, Math.max(0, fitScore))
  const buyingIntentScore = Math.round(fitScore * 0.8 + Math.random() * 20)

  return {
    fitScore,
    fitReasoning: `Based on ${signals.funding_signals?.length || 0} funding signals, ${signals.hiring_patterns?.length || 0} hiring patterns, and company profile analysis.`,
    buyingIntentScore,
    growthIndicators,
    keyInsights: keyInsights.length > 0 ? keyInsights : ['Profile analysis complete'],
    riskFactors: fitScore < 60 ? ['Limited buying signals detected'] : [],
    recommendedApproach: fitScore >= 70 
      ? 'High-priority outreach - personalized approach recommended'
      : 'Standard nurture sequence',
  }
}

export const handler: Handlers['AnalyzeProspect'] = async (input, { emit, logger, state }) => {
  const { batch_id, prospect_index, prospect, signals, news_items } = input

  logger.info('Starting AI analysis', { prospectId: prospect.id, company: prospect.company_name })

  try {
    const analysis = await analyzeWithAI(prospect, signals, news_items)

    logger.info('AI analysis complete', {
      prospectId: prospect.id, company: prospect.company_name,
      fitScore: analysis.fitScore, buyingIntent: analysis.buyingIntentScore,
    })

    await state.set('prospect_analysis', prospect.id, {
      prospect_id: prospect.id, analysis, analyzed_at: new Date().toISOString(),
    })

    await emit({
      topic: 'prospect.analyzed',
      data: { batch_id, prospect_index, prospect, signals, news_items, analysis },
    })
  } catch (error: any) {
    logger.error('AI analysis failed', { prospectId: prospect.id, error: error.message })

    await state.set('research_results', prospect.id, {
      prospect_id: prospect.id, prospect, signals, news_items, status: 'failed',
      error_message: `AI analysis failed: ${error.message}`,
      created_at: new Date().toISOString(),
    })

    await emit({
      topic: 'prospect.research.failed',
      data: { batch_id, prospect_index, prospect_id: prospect.id, error: error.message, stage: 'ai_analysis' },
    })
  }
}
