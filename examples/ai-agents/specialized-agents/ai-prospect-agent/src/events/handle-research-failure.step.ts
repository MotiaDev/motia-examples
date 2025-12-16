/**
 * Handle Research Failure Event Step
 * Logs failures and updates batch progress for failed prospects
 */
import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  batch_id: z.string(),
  prospect_index: z.number(),
  prospect_id: z.string(),
  error: z.string(),
  stage: z.string(),
  partial_result: z.object({
    fit_score: z.number().optional(),
    buying_intent_score: z.number().optional(),
  }).optional(),
})

export const config: EventConfig = {
  name: 'HandleResearchFailure',
  type: 'event',
  description: 'Handles and logs research pipeline failures',
  subscribes: ['prospect.research.failed'],
  emits: [],
  input: inputSchema,
  flows: ['prospect-research'],
}

export const handler: Handlers['HandleResearchFailure'] = async (input, { logger, state }) => {
  const { batch_id, prospect_id, error, stage, partial_result } = input

  logger.error('Research pipeline failure', {
    batchId: batch_id,
    prospectId: prospect_id,
    stage,
    error,
    partialResult: partial_result,
  })

  // Update batch progress (count failure) from state
  const batch = await state.get<any>('batches', batch_id)

  if (batch) {
    const newProcessedCount = (batch.processed_count || 0) + 1
    
    await state.set('batches', batch_id, {
      ...batch,
      processed_count: newProcessedCount,
      status: newProcessedCount >= batch.total_prospects ? 'completed' : 'processing',
    })

    // Track zero score for failed prospects
    const batchScoresKey = `batch_scores_${batch_id}`
    const currentScores = (await state.get<number[]>('batch_scores', batchScoresKey)) || []
    currentScores.push(partial_result?.fit_score || 0)
    await state.set('batch_scores', batchScoresKey, currentScores)
  }

  // Log failure for audit trail
  const failureLog = {
    prospect_id,
    batch_id,
    stage,
    error,
    partial_result,
    failed_at: new Date().toISOString(),
  }

  await state.set('research_failures', `${batch_id}_${prospect_id}`, failureLog)

  logger.info('Failure logged and batch progress updated', {
    prospectId: prospect_id,
    batchId: batch_id,
  })
}
