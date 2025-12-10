/**
 * List Games API Step
 * GET /games - List all game generation flows
 */
import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware'
import { GameGenerationState } from '../../src/utils/flow-helpers'

const listResponseSchema = z.object({
  games: z.array(z.object({
    flowId: z.string(),
    title: z.string(),
    genre: z.string(),
    complexity: z.string(),
    status: z.string(),
    createdAt: z.string(),
    completedAt: z.string().optional(),
    qaScore: z.number().optional(),
    qualityGrade: z.string().optional(),
  })),
  total: z.number(),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ListGamesApi',
  description: 'List all game generation flows',
  path: '/games',
  method: 'GET',
  emits: [],
  flows: ['game-generation'],
  middleware: [errorHandlerMiddleware],
  responseSchema: {
    200: listResponseSchema,
  },
}

export const handler: Handlers['ListGamesApi'] = async (_req, { logger, state, traceId }) => {
  logger.info('Listing all games', { traceId })

  // Get all game flows from state
  const allFlows = await state.getGroup<GameGenerationState>('game-flows')
  
  // Map to response format
  const games = allFlows.map(flow => ({
    flowId: flow.metadata.flowId,
    title: flow.spec.title,
    genre: flow.spec.genre,
    complexity: flow.spec.complexity,
    status: flow.metadata.status,
    createdAt: flow.metadata.createdAt,
    completedAt: flow.metadata.completedAt,
    qaScore: flow.qaReport?.overallScore,
    qualityGrade: flow.finalValidation?.qualityGrade,
  }))

  // Sort by creation date (newest first)
  games.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  logger.info('Games listed', { total: games.length, traceId })

  return {
    status: 200,
    body: {
      games,
      total: games.length,
    },
  }
}

