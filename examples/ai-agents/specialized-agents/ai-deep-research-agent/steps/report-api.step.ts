import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  requestId: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Research Report API',
  description: 'API endpoint to retrieve research reports',
  path: '/research/report',
  method: 'GET',
  emits: [],
  bodySchema: inputSchema,
  flows: ['research'],
}

export const handler: Handlers['Research Report API'] = async (req, { logger, state }) => {
  const requestId = req.queryParams.requestId as string
  logger.info('Retrieving research report', { requestId })

  try {
    // Retrieve the final report from state
    const finalReport = await state.get(requestId, 'finalReport')
    
    if (!finalReport) {
      return {
        status: 404,
        body: { 
          message: 'Research report not found',
          requestId 
        },
      }
    }

    return {
      status: 200,
      body: { 
        message: 'Research report retrieved successfully',
        report: finalReport,
        requestId
      },
    }
  } catch (error: any) {
    logger.error('Error retrieving research report', { requestId, error })
    
    return {
      status: 500,
      body: { 
        message: 'Failed to retrieve research report',
        requestId,
        error: error.message
      },
    }
  }
} 