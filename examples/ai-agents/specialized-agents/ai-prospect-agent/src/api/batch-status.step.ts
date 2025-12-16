/**
 * Batch Status API Step
 * Get status of a prospect upload batch
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
  name: 'GetBatchStatus',
  type: 'api',
  path: '/api/batches/:batchId',
  method: 'GET',
  description: 'Get status and progress of a prospect upload batch',
  emits: [],
  flows: ['prospect-research'],
  middleware: [coreMiddleware],
  responseSchema: {
    200: z.object({
      batch: z.object({
        id: z.string(),
        filename: z.string(),
        total_prospects: z.number(),
        processed_count: z.number(),
        status: z.string(),
        progress_percent: z.number(),
        created_at: z.string(),
      }),
      stats: z.object({
        completed: z.number(),
        pending: z.number(),
        failed: z.number(),
        average_score: z.number().nullable(),
        high_score_count: z.number(),
      }),
    }),
    404: z.object({ error: z.string() }),
  },
}

export const handler: Handlers['GetBatchStatus'] = async (req, { logger, state }) => {
  const { batchId } = req.pathParams

  logger.info('Fetching batch status', { batchId })

  const batch = await state.get<any>('batches', batchId)

  if (!batch) {
    return { status: 404, body: { error: 'Batch not found' } }
  }

  const prospects = batch.prospects || []

  // Gather research stats
  let completed = 0, pending = 0, failed = 0
  let totalScore = 0, highScoreCount = 0

  for (const prospect of prospects) {
    const research = await state.get<any>('research_results', prospect.id)

    if (!research) {
      pending++
    } else if (research.status === 'completed') {
      completed++
      if (research.fit_score) {
        totalScore += research.fit_score
        if (research.fit_score >= 80) highScoreCount++
      }
    } else if (research.status === 'failed') {
      failed++
    } else {
      pending++
    }
  }

  const processedCount = completed + failed
  const progressPercent = batch.total_prospects > 0 ? Math.round((processedCount / batch.total_prospects) * 100) : 0
  const averageScore = completed > 0 ? Math.round(totalScore / completed) : null

  return {
    status: 200,
    body: {
      batch: {
        id: batch.id,
        filename: batch.filename,
        total_prospects: batch.total_prospects,
        processed_count: processedCount,
        status: processedCount === batch.total_prospects ? 'completed' : batch.status,
        progress_percent: progressPercent,
        created_at: batch.created_at || new Date().toISOString(),
      },
      stats: { completed, pending, failed, average_score: averageScore, high_score_count: highScoreCount },
    },
  }
}
