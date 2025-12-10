import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ResearchConfig } from './types/research-config'

const inputSchema = z.object({
  requestId: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Research Status API',
  description: 'API endpoint to check the status of a research process',
  path: '/research/status',
  method: 'GET',
  emits: [],
  bodySchema: inputSchema,
  flows: ['research'],
}

export const handler: Handlers['Research Status API'] = async (req, { logger, state }) => {
  const requestId = req.queryParams.requestId as string
  logger.info('Checking research status', { requestId })

  try {
    // Retrieve original query and research config
    const originalQuery = await state.get(requestId, 'originalQuery')
    const researchConfig = await state.get<ResearchConfig>(requestId, 'researchConfig')
    const finalReport = await state.get(requestId, 'finalReport')
    
    if (!originalQuery || !researchConfig) {
      return {
        status: 404,
        body: { 
          message: 'Research not found',
          requestId 
        },
      }
    }

    const status = finalReport ? 'completed' : 'in-progress'
    const progress = researchConfig ? {
      currentDepth: researchConfig.currentDepth,
      totalDepth: researchConfig.depth,
      percentComplete: Math.round((researchConfig.currentDepth / researchConfig.depth) * 100)
    } : null

    return {
      status: 200,
      body: { 
        message: 'Research status retrieved successfully',
        requestId,
        originalQuery,
        status,
        progress,
        reportAvailable: !!finalReport
      },
    }
  } catch (error: any) {
    logger.error('Error checking research status', { requestId, error })
    
    return {
      status: 500,
      body: { 
        message: 'Failed to check research status',
        requestId,
        error: error.message
      },
    }
  }
} 