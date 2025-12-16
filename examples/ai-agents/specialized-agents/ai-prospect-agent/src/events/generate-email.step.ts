/**
 * Generate Email Event Step
 * Creates personalized outreach email using AI
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
  analysis: z.object({
    fitScore: z.number(),
    fitReasoning: z.string(),
    buyingIntentScore: z.number(),
    growthIndicators: z.array(z.any()),
    keyInsights: z.array(z.string()),
    riskFactors: z.array(z.string()),
    recommendedApproach: z.string(),
  }),
})

export const config: EventConfig = {
  name: 'GenerateEmail',
  type: 'event',
  description: 'Generates personalized outreach email with talking points',
  subscribes: ['prospect.analyzed'],
  emits: ['prospect.research.completed', 'prospect.research.failed'],
  input: inputSchema,
  flows: ['prospect-research'],
}

// Inline email generation
async function generateEmailWithAI(prospect: any, analysis: any, signals: any): Promise<any> {
  const geminiKey = process.env.GEMINI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  
  const prompt = `You are a sales email copywriter. Generate a personalized cold outreach email.

## Recipient
- Name: ${prospect.first_name} ${prospect.last_name}
- Title: ${prospect.title}
- Company: ${prospect.company_name}
- Industry: ${prospect.industry}

## Analysis
- Fit Score: ${analysis.fitScore}/100
- Key Insights: ${analysis.keyInsights.join('; ')}
- Recommended Approach: ${analysis.recommendedApproach}

## Signals
${signals.news_signals?.slice(0, 2).map((n: any) => `- ${n.headline}`).join('\n') || 'N/A'}
${signals.funding_signals?.length > 0 ? `- Funding: ${signals.funding_signals[0].type}` : ''}

## Requirements
1. Compelling, personalized subject line
2. Reference something specific about their company
3. Connect their situation to value proposition
4. Soft CTA, under 150 words, human tone
5. Include 3-5 talking points for follow-up

Respond in JSON:
{
  "subject": "string",
  "body": "string",
  "talkingPoints": ["string"]
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
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('AI email generation error:', e)
  }

  // Fallback template
  return {
    subject: `Quick thought for ${prospect.company_name}`,
    body: `Hi ${prospect.first_name},

I noticed ${prospect.company_name} is in an exciting growth phase${signals.funding_signals?.length > 0 ? ` following your recent ${signals.funding_signals[0].type}` : ''}.

Companies at your stage often face challenges with scaling operations efficiently. I'd love to share how we've helped similar ${prospect.industry} companies navigate this.

Would you be open to a brief conversation next week?

Best,
[Your Name]`,
    talkingPoints: [
      `${prospect.company_name}'s growth trajectory and challenges`,
      `Industry-specific solutions for ${prospect.industry}`,
      `ROI examples from similar companies`,
    ],
  }
}

export const handler: Handlers['GenerateEmail'] = async (input, { emit, logger, state }) => {
  const { batch_id, prospect_index, prospect, signals, news_items, analysis } = input

  logger.info('Generating email', { prospectId: prospect.id, company: prospect.company_name, fitScore: analysis.fitScore })

  try {
    const emailDraft = await generateEmailWithAI(prospect, analysis, signals)

    logger.info('Email generated', {
      prospectId: prospect.id, company: prospect.company_name,
      subject: emailDraft.subject, talkingPoints: emailDraft.talkingPoints.length,
    })

    const researchResult = {
      prospect_id: prospect.id,
      prospect,
      fit_score: analysis.fitScore,
      fit_reasoning: analysis.fitReasoning,
      buying_intent_score: analysis.buyingIntentScore,
      growth_indicators: analysis.growthIndicators,
      key_insights: analysis.keyInsights,
      risk_factors: analysis.riskFactors,
      signals,
      news_mentions: news_items,
      email_subject: emailDraft.subject,
      email_draft: emailDraft.body,
      talking_points: emailDraft.talkingPoints,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await state.set('research_results', prospect.id, researchResult)

    await emit({
      topic: 'prospect.research.completed',
      data: {
        batch_id, prospect_index, prospect_id: prospect.id,
        company_name: prospect.company_name,
        contact_name: `${prospect.first_name} ${prospect.last_name}`,
        fit_score: analysis.fitScore,
        buying_intent_score: analysis.buyingIntentScore,
        key_insight: analysis.keyInsights[0] || analysis.fitReasoning.slice(0, 100),
        industry: prospect.industry,
      },
    })
  } catch (error: any) {
    logger.error('Email generation failed', { prospectId: prospect.id, error: error.message })

    await state.set('research_results', prospect.id, {
      prospect_id: prospect.id, prospect, fit_score: analysis.fitScore,
      fit_reasoning: analysis.fitReasoning, buying_intent_score: analysis.buyingIntentScore,
      signals, news_mentions: news_items, status: 'failed',
      error_message: `Email generation failed: ${error.message}`,
      created_at: new Date().toISOString(),
    })

    await emit({
      topic: 'prospect.research.failed',
      data: {
        batch_id, prospect_index, prospect_id: prospect.id,
        error: error.message, stage: 'email_generation',
        partial_result: { fit_score: analysis.fitScore, buying_intent_score: analysis.buyingIntentScore },
      },
    })
  }
}
