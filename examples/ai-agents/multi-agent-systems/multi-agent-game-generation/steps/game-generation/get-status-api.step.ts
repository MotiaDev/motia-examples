/**
 * Get Game Status API Step
 * GET /games/:flowId/status - Get the current status of a game generation flow
 */
import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware'
import { GameGenerationState } from '../../src/utils/flow-helpers'

const statusResponseSchema = z.object({
  flowId: z.string(),
  status: z.string(),
  currentStep: z.string(),
  progress: z.object({
    architect: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
    engineer: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
    qaReview: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
    chiefQa: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
  }),
  gameTitle: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
  revisionCount: z.number(),
  qaScore: z.number().optional(),
  qualityGrade: z.string().optional(),
  error: z.string().optional(),
  logs: z.array(z.object({
    timestamp: z.string(),
    step: z.string(),
    message: z.string(),
    level: z.string(),
  })),
})

const errorResponseSchema = z.object({
  error: z.string(),
  traceId: z.string().optional(),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetGameStatusApi',
  description: 'Get the current status and progress of a game generation flow',
  path: '/games/:flowId/status',
  method: 'GET',
  emits: [],
  flows: ['game-generation'],
  middleware: [errorHandlerMiddleware],
  responseSchema: {
    200: statusResponseSchema,
    404: errorResponseSchema,
  },
}

export const handler: Handlers['GetGameStatusApi'] = async (req, { logger, state, traceId }) => {
  const { flowId } = req.pathParams
  
  logger.info('Fetching game status', { flowId, traceId })

  // Get flow state
  const flowState = await state.get<GameGenerationState>('game-flows', flowId)
  
  if (!flowState) {
    logger.warn('Flow not found', { flowId, traceId })
    return {
      status: 404,
      body: {
        error: `Game generation flow not found: ${flowId}`,
        traceId,
      },
    }
  }

  // Determine progress for each step
  const getStepProgress = (step: string): 'pending' | 'in_progress' | 'completed' | 'skipped' => {
    const currentStep = flowState.metadata.currentStep
    const status = flowState.metadata.status

    const stepOrder = ['initialization', 'architect-agent', 'engineer-agent', 'qa-agent', 'chief-qa-agent', 'completion-handler']
    const stepIndex = stepOrder.indexOf(step)
    const currentIndex = stepOrder.indexOf(currentStep)

    if (status === 'completed') return 'completed'
    if (status === 'failed') return stepIndex <= currentIndex ? 'completed' : 'skipped'
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'in_progress'
    return 'pending'
  }

  const response = {
    flowId,
    status: flowState.metadata.status,
    currentStep: flowState.metadata.currentStep,
    progress: {
      architect: getStepProgress('architect-agent'),
      engineer: getStepProgress('engineer-agent'),
      qaReview: getStepProgress('qa-agent'),
      chiefQa: getStepProgress('chief-qa-agent'),
    },
    gameTitle: flowState.spec.title,
    createdAt: flowState.metadata.createdAt,
    updatedAt: flowState.metadata.updatedAt,
    completedAt: flowState.metadata.completedAt,
    revisionCount: flowState.metadata.revisionCount,
    qaScore: flowState.qaReport?.overallScore,
    qualityGrade: flowState.finalValidation?.qualityGrade,
    error: flowState.metadata.error,
    logs: flowState.logs,
  }

  logger.info('Status retrieved', { flowId, status: response.status, traceId })

  return {
    status: 200,
    body: response,
  }
}

