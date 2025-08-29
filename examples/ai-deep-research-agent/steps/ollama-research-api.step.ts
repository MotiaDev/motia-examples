import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  query: z.string().min(1, "Research query is required"),
  breadth: z.number().int().min(1).max(10).default(4),
  depth: z.number().int().min(1).max(5).default(2),
  ollamaHost: z.string().url().optional(),
  ollamaModel: z.string().optional(),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Ollama Deep Research API',
  description: 'API endpoint to start a deep research process using Ollama LLM',
  path: '/research/ollama',
  method: 'POST',
  emits: [{
    topic: 'ollama-research-started',
    label: 'Ollama research process started',
  }],
  bodySchema: inputSchema,
  flows: ['ollama-research'],
}

export const handler: Handlers['Ollama Deep Research API'] = async (req, { logger, emit, traceId }) => {
  logger.info('Starting Ollama-powered deep research process', { 
    query: req.body.query, 
    breadth: req.body.breadth, 
    depth: req.body.depth,
    ollamaHost: req.body.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434',
    ollamaModel: req.body.ollamaModel || process.env.OLLAMA_MODEL || 'llama3.1',
    traceId 
  })

  await emit({
    topic: 'ollama-research-started',
    data: {
      query: req.body.query,
      breadth: req.body.breadth,
      depth: req.body.depth,
      ollamaHost: req.body.ollamaHost,
      ollamaModel: req.body.ollamaModel,
      requestId: traceId,
      provider: 'ollama'
    },
  })

  return {
    status: 200,
    body: { 
      message: 'Ollama research process started',
      requestId: traceId,
      provider: 'ollama',
      configuration: {
        host: req.body.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434',
        model: req.body.ollamaModel || process.env.OLLAMA_MODEL || 'llama3.1'
      }
    },
  }
}
