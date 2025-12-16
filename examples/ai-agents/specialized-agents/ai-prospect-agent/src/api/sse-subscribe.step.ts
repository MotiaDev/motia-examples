/**
 * SSE Subscribe API Step
 * Server-Sent Events endpoint for real-time updates
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
  name: 'SSESubscribe',
  type: 'api',
  path: '/api/sse/subscribe/:batchId',
  method: 'GET',
  description: 'Subscribe to real-time research updates via Server-Sent Events',
  emits: [],
  flows: ['streaming'],
  middleware: [coreMiddleware],
  queryParams: [
    { name: 'prospect_id', description: 'Optional: Subscribe to specific prospect updates' },
  ],
  responseSchema: {
    200: z.object({
      stream_url: z.string(),
      message: z.string(),
    }),
  },
}

export const handler: Handlers['SSESubscribe'] = async (req, { logger }) => {
  const { batchId } = req.pathParams
  const prospectId = req.queryParams.prospect_id as string | undefined

  logger.info('SSE subscription request', { batchId, prospectId })

  // In a real implementation, this would set up SSE headers and stream
  // Motia handles this through the streams configuration
  // This endpoint provides the stream connection details

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
  const streamUrl = prospectId
    ? `${baseUrl}/__motia/streams/prospectResearch?groupId=${batchId}&id=${prospectId}`
    : `${baseUrl}/__motia/streams/prospectResearch?groupId=${batchId}`

  return {
    status: 200,
    body: {
      stream_url: streamUrl,
      message: 'Connect to stream_url for real-time updates. Use WebSocket or EventSource.',
    },
  }
}

