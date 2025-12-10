/**
 * Download Game API Step
 * GET /games/:flowId/download - Download the generated game files
 */
import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware'
import { GameGenerationState, formatGameFilesForDownload } from '../../src/utils/flow-helpers'

const downloadResponseSchema = z.object({
  flowId: z.string(),
  gameTitle: z.string(),
  status: z.string(),
  files: z.array(z.object({
    filename: z.string(),
    content: z.string(),
  })),
  mainFile: z.string(),
  runInstructions: z.string(),
  metadata: z.object({
    genre: z.string(),
    complexity: z.string(),
    qaScore: z.number().optional(),
    qualityGrade: z.string().optional(),
    generatedAt: z.string(),
    revisionCount: z.number(),
  }),
  design: z.object({
    overview: z.string(),
    dependencies: z.array(z.string()),
    architectNotes: z.string(),
  }).optional(),
})

const errorResponseSchema = z.object({
  error: z.string(),
  status: z.string().optional(),
  traceId: z.string().optional(),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'DownloadGameApi',
  description: 'Download the generated game files and metadata',
  path: '/games/:flowId/download',
  method: 'GET',
  emits: [],
  flows: ['game-generation'],
  middleware: [errorHandlerMiddleware],
  responseSchema: {
    200: downloadResponseSchema,
    404: errorResponseSchema,
    425: errorResponseSchema,
  },
}

export const handler: Handlers['DownloadGameApi'] = async (req, { logger, state, traceId }) => {
  const { flowId } = req.pathParams
  
  logger.info('Download request received', { flowId, traceId })

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

  // Check if generation is complete
  if (flowState.metadata.status !== 'completed') {
    logger.info('Game not ready for download', {
      flowId,
      status: flowState.metadata.status,
      traceId,
    })
    return {
      status: 425,
      body: {
        error: 'Game generation is not complete yet',
        status: flowState.metadata.status,
        traceId,
      },
    }
  }

  // Check if we have code
  if (!flowState.code) {
    logger.error('Completed flow has no code', { flowId, traceId })
    return {
      status: 404,
      body: {
        error: 'Game code not found. Generation may have failed.',
        traceId,
      },
    }
  }

  // Format response
  const gameFiles = formatGameFilesForDownload(flowState.code)
  
  const response = {
    flowId,
    gameTitle: flowState.spec.title,
    status: 'completed',
    files: gameFiles.files,
    mainFile: gameFiles.mainFile,
    runInstructions: gameFiles.runInstructions,
    metadata: {
      genre: flowState.spec.genre,
      complexity: flowState.spec.complexity,
      qaScore: flowState.qaReport?.overallScore,
      qualityGrade: flowState.finalValidation?.qualityGrade,
      generatedAt: flowState.metadata.completedAt || flowState.metadata.updatedAt,
      revisionCount: flowState.metadata.revisionCount,
    },
    design: flowState.design ? {
      overview: flowState.design.overview,
      dependencies: flowState.design.dependencies,
      architectNotes: flowState.design.architectNotes,
    } : undefined,
  }

  logger.info('Game download prepared', {
    flowId,
    gameTitle: response.gameTitle,
    fileCount: response.files.length,
    traceId,
  })

  return {
    status: 200,
    body: response,
  }
}

