import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  query: z.string().min(1, "Research query is required"),
  breadth: z.number().int().min(1).max(10).default(4),
  depth: z.number().int().min(1).max(5).default(2),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Deep Research API',
  description: 'API endpoint to start a deep research process',
  path: '/research',
  method: 'POST',
  emits: [{
    topic: 'research-started',
    label: 'Research process started',
  }],
  bodySchema: inputSchema,
  flows: ['research'],
}

export const handler: Handlers['Deep Research API'] = async (req, { logger, emit, traceId }) => {
  logger.info('Starting deep research process', { 
    query: req.body.query, 
    breadth: req.body.breadth, 
    depth: req.body.depth,
    traceId 
  })

  await emit({
    topic: 'research-started',
    data: {
      query: req.body.query,
      breadth: req.body.breadth,
      depth: req.body.depth,
      requestId: traceId
    },
  })

  return {
    status: 200,
    body: { 
      message: 'Research process started',
      requestId: traceId
    },
  }
} 