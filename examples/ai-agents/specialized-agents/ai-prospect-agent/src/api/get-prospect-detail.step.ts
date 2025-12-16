/**
 * Get Prospect Detail API Step
 * Retrieve detailed research results for a specific prospect
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
  name: 'GetProspectDetail',
  type: 'api',
  path: '/api/prospects/:id',
  method: 'GET',
  description: 'Get detailed research results for a specific prospect',
  emits: [],
  flows: ['prospect-research'],
  middleware: [coreMiddleware],
  responseSchema: {
    200: z.object({
      prospect: z.any(),
      research: z.any().nullable(),
    }),
    404: z.object({ error: z.string() }),
  },
}

export const handler: Handlers['GetProspectDetail'] = async (req, { logger, state }) => {
  const { id } = req.pathParams

  logger.info('Fetching prospect detail', { id })

  const research = await state.get<any>('research_results', id)
  
  if (!research) {
    return { status: 404, body: { error: 'Prospect not found' } }
  }

  return {
    status: 200,
    body: {
      prospect: research.prospect || { id },
      research: {
        fit_score: research.fit_score,
        fit_reasoning: research.fit_reasoning,
        buying_intent_score: research.buying_intent_score,
        signals: research.signals,
        news_mentions: research.news_mentions || [],
        growth_indicators: research.growth_indicators || [],
        email_subject: research.email_subject,
        email_draft: research.email_draft,
        talking_points: research.talking_points || [],
        status: research.status,
        created_at: research.created_at,
      },
    },
  }
}
