/**
 * Get Prospects API Step
 * Query and filter researched prospects
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
  name: 'GetProspects',
  type: 'api',
  path: '/api/prospects',
  method: 'GET',
  description: 'Query prospects with optional filters',
  emits: [],
  flows: ['prospect-research'],
  middleware: [coreMiddleware],
  queryParams: [
    { name: 'industry', description: 'Filter by industry' },
    { name: 'region', description: 'Filter by region' },
    { name: 'min_score', description: 'Minimum fit score (0-100)' },
    { name: 'limit', description: 'Maximum results to return' },
    { name: 'batch_id', description: 'Filter by upload batch' },
  ],
  responseSchema: {
    200: z.object({
      prospects: z.array(z.object({
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
        fit_score: z.number().optional(),
        fit_reasoning: z.string().optional(),
        buying_intent_score: z.number().optional(),
        email_subject: z.string().optional(),
        email_draft: z.string().optional(),
        talking_points: z.array(z.string()).optional(),
        research_status: z.string().optional(),
      })),
      total: z.number(),
    }),
  },
}

export const handler: Handlers['GetProspects'] = async (req, { logger, state }) => {
  const { industry, region, min_score, limit, batch_id } = req.queryParams

  logger.info('Querying prospects', { industry, region, min_score, limit, batch_id })

  // Get all batches from state
  const allBatches = await state.getGroup<any>('batches')
  let allProspects: any[] = []

  for (const batch of allBatches) {
    if (batch_id && batch.id !== batch_id) continue
    allProspects.push(...(batch.prospects || []))
  }

  // Apply filters
  if (industry) allProspects = allProspects.filter(p => p.industry === industry)
  if (region) allProspects = allProspects.filter(p => p.region === region)

  // Get research results and format
  const formattedProspects = await Promise.all(
    allProspects.slice(0, parseInt(limit as string) || 50).map(async (p) => {
      const research = await state.get<any>('research_results', p.id)
      return {
        id: p.id,
        company_name: p.company_name,
        domain: p.domain,
        email: p.email,
        first_name: p.first_name,
        last_name: p.last_name,
        title: p.title,
        industry: p.industry,
        region: p.region,
        company_size: p.company_size,
        stage: p.stage,
        fit_score: research?.fit_score,
        fit_reasoning: research?.fit_reasoning,
        buying_intent_score: research?.buying_intent_score,
        email_subject: research?.email_subject,
        email_draft: research?.email_draft,
        talking_points: research?.talking_points,
        research_status: research?.status || 'pending',
      }
    })
  )

  // Apply min_score filter
  let filtered = formattedProspects
  if (min_score) {
    const minScoreNum = parseInt(min_score as string)
    filtered = formattedProspects.filter(p => (p.fit_score || 0) >= minScoreNum)
  }

  return { status: 200, body: { prospects: filtered, total: filtered.length } }
}
