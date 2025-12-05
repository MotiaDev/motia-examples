/**
 * Generate Game API Step
 * POST /games/generate - Entry point for game generation pipeline
 * 
 * Accepts a game specification and triggers the multi-agent workflow
 */
import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware'
import { createFlowId, createInitialState } from '../../src/utils/flow-helpers'

// Request body schema
const bodySchema = z.object({
  title: z.string().min(1, 'Game title is required').max(100),
  genre: z.string().min(1, 'Genre is required'),
  mechanics: z.array(z.string()).min(1, 'At least one game mechanic is required'),
  theme: z.string().min(1, 'Theme is required'),
  targetAudience: z.string().min(1, 'Target audience is required'),
  complexity: z.enum(['simple', 'medium', 'complex']),
  additionalRequirements: z.string().optional(),
})

// Response schemas
const successResponseSchema = z.object({
  flowId: z.string(),
  status: z.string(),
  message: z.string(),
  estimatedTime: z.string(),
  statusEndpoint: z.string(),
  downloadEndpoint: z.string(),
})

const errorResponseSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
  traceId: z.string().optional(),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GenerateGameApi',
  description: 'Submit a game specification to start the multi-agent game generation pipeline',
  path: '/games/generate',
  method: 'POST',
  emits: [
    { topic: 'game_generation.requested', label: 'Triggers architect agent' },
  ],
  flows: ['game-generation'],
  middleware: [errorHandlerMiddleware],
  bodySchema,
  responseSchema: {
    202: successResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema,
  },
}

export const handler: Handlers['GenerateGameApi'] = async (req, { emit, logger, state, traceId }) => {
  // Parse and validate request body
  const spec = bodySchema.parse(req.body)
  
  logger.info('Game generation request received', {
    title: spec.title,
    genre: spec.genre,
    complexity: spec.complexity,
    traceId,
  })

  // Create unique flow ID
  const flowId = createFlowId()
  
  // Initialize flow state
  const initialState = createInitialState(flowId, spec)
  
  // Store initial state
  await state.set('game-flows', flowId, initialState)
  
  logger.info('Flow initialized', { flowId, traceId })

  // Emit event to start the architect agent
  await emit({
    topic: 'game_generation.requested',
    data: {
      flowId,
      spec,
    },
  })

  logger.info('Game generation pipeline started', { flowId, traceId })

  // Return accepted response with tracking info
  return {
    status: 202,
    body: {
      flowId,
      status: 'accepted',
      message: `Game generation started for "${spec.title}". Use the status endpoint to track progress.`,
      estimatedTime: spec.complexity === 'simple' ? '1-2 minutes' : 
                     spec.complexity === 'medium' ? '2-4 minutes' : '3-5 minutes',
      statusEndpoint: `/games/${flowId}/status`,
      downloadEndpoint: `/games/${flowId}/download`,
    },
  }
}

