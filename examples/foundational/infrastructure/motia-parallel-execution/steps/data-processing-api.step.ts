import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'DataProcessingApi',
  description: 'Trigger parallel data processing workflow',
  method: 'POST',
  path: '/process-data',
  emits: ['parallel-processing'],
  bodySchema: z.object({ 
    text: z.string().min(1, 'Text content is required'),
    id: z.string().optional()
  }),
  responseSchema: {
    200: z.object({ 
      message: z.string(),
      traceId: z.string(),
      streamId: z.string()
    })
  },
  flows: ['parallel-processing'],
}

export const handler: Handlers['DataProcessingApi'] = async (req, { traceId, logger, emit, streams }) => {
  logger.info('Step 04 – Starting parallel data processing', { body: req.body })

  const processingId = req.body.id || `processing-${Date.now()}`
  
  try {
    await streams.processingProgress.set(traceId, processingId, {
      status: 'started',
      progress: 0,
      results: {}
    })
  } catch (error) {
    logger.warn('Stream not available, continuing without progress tracking', { error })
  }

  await emit({
    topic: 'parallel-processing',
    data: { 
      text: req.body.text,
      processingId
    },
  })

  return {
    status: 200,
    body: { 
      message: 'Parallel processing started',
      traceId,
      streamId: processingId
    },
  }
}
