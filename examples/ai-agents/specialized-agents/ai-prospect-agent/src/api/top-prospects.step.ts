/**
 * Top Prospects API Step
 * Get ranked list of best-fit prospects for sales prioritization
 */
import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ApiMiddleware } from 'motia'

const coreMiddleware: ApiMiddleware = async (req, ctx, next) => {
  try {
    return await next()
  } catch (error: any) {
    ctx.logger.error('Request failed', { error: error.message })
    return { status: 500, body: { error: 'Internal Server Error' } }
  }
}

export const config: ApiRouteConfig = {
  name: 'GetTopProspects',
  type: 'api',
  path: '/api/prospects/top',
  method: 'GET',
  description: 'Get top-ranked prospects by fit score for sales prioritization',
  emits: [],
  flows: ['prospect-research'],
  middleware: [coreMiddleware],
  queryParams: [
    { name: 'limit', description: 'Number of prospects to return (default: 10)' },
    { name: 'min_score', description: 'Minimum fit score threshold (default: 70)' },
  ],
  responseSchema: {
    200: z.object({
      prospects: z.array(z.object({
        id: z.string(),
        rank: z.number(),
        company_name: z.string(),
        contact_name: z.string(),
        title: z.string(),
        email: z.string(),
        industry: z.string(),
        fit_score: z.number(),
        buying_intent_score: z.number(),
        key_insight: z.string(),
        email_subject: z.string(),
        recommended_approach: z.string(),
      })),
      total: z.number(),
      average_score: z.number(),
    }),
  },
}

export const handler: Handlers['GetTopProspects'] = async (req, { logger, state }) => {
  const limit = parseInt(req.queryParams.limit as string) || 10
  const minScore = parseInt(req.queryParams.min_score as string) || 70

  logger.info('Fetching top prospects', { limit, minScore })

  // Get all research results from state
  const allResults = await state.getGroup<any>('research_results')
  
  const validResults = allResults
    .filter(r => r.status === 'completed' && r.fit_score >= minScore)
    .sort((a, b) => b.fit_score - a.fit_score)
    .slice(0, limit)

  const formatted = validResults.map((r, idx) => ({
    id: r.prospect_id || r.id,
    rank: idx + 1,
    company_name: r.prospect?.company_name || 'Unknown',
    contact_name: r.prospect ? `${r.prospect.first_name} ${r.prospect.last_name}` : 'Unknown',
    title: r.prospect?.title || '',
    email: r.prospect?.email || '',
    industry: r.prospect?.industry || '',
    fit_score: r.fit_score,
    buying_intent_score: r.buying_intent_score,
    key_insight: r.talking_points?.[0] || r.fit_reasoning?.slice(0, 100) || '',
    email_subject: r.email_subject || '',
    recommended_approach: r.fit_reasoning?.slice(0, 200) || '',
  }))

  const avgScore = formatted.length > 0
    ? formatted.reduce((sum, p) => sum + p.fit_score, 0) / formatted.length
    : 0

  return {
    status: 200,
    body: {
      prospects: formatted,
      total: formatted.length,
      average_score: Math.round(avgScore * 10) / 10,
    },
  }
}
