/**
 * Update Batch Progress Event Step
 * Tracks batch completion and sends summary notifications
 */
import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

// Define schema inline per Motia pattern
const inputSchema = z.object({
  batch_id: z.string(),
  prospect_index: z.number(),
  prospect_id: z.string(),
  company_name: z.string(),
  contact_name: z.string(),
  fit_score: z.number(),
  buying_intent_score: z.number(),
  key_insight: z.string(),
  industry: z.string(),
})

export const config: EventConfig = {
  name: 'UpdateBatchProgress',
  type: 'event',
  description: 'Updates batch progress and notifies on completion',
  subscribes: ['prospect.research.completed'],
  emits: ['batch.completed'],
  input: inputSchema,
  flows: ['prospect-research'],
}

// Inline Slack notification
async function sendSlackBatchComplete(
  batchId: string,
  totalProspects: number,
  highScoreCount: number,
  avgScore: number
): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return false

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `📦 Batch research completed: ${totalProspects} prospects analyzed`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '📦 Batch Research Completed', emoji: true },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Total Prospects:*\n${totalProspects}` },
              { type: 'mrkdwn', text: `*High Score (80+):*\n${highScoreCount}` },
              { type: 'mrkdwn', text: `*Average Score:*\n${avgScore.toFixed(1)}` },
              { type: 'mrkdwn', text: `*Batch ID:*\n${batchId.slice(0, 8)}...` },
            ],
          },
        ],
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

interface BatchState {
  processed_count?: number
  total_prospects: number
  status: string
}

export const handler: Handlers['UpdateBatchProgress'] = async (input, { emit, logger, state }) => {
  const { batch_id, fit_score } = input

  logger.info('Updating batch progress', { batchId: batch_id })

  // Get current batch status from state
  const batch = await state.get<BatchState>('batches', batch_id)

  if (!batch) {
    logger.warn('Batch not found', { batchId: batch_id })
    return
  }

  // Increment processed count
  const newProcessedCount = (batch.processed_count || 0) + 1

  // Update batch in state
  await state.set('batches', batch_id, {
    ...batch,
    processed_count: newProcessedCount,
    status: newProcessedCount >= batch.total_prospects ? 'completed' : 'processing',
  })

  // Track scores for batch summary
  const batchScoresKey = `batch_scores_${batch_id}`
  const currentScores = (await state.get<number[]>('batch_scores', batchScoresKey)) || []
  currentScores.push(fit_score)
  await state.set('batch_scores', batchScoresKey, currentScores)

  logger.info('Batch progress updated', {
    batchId: batch_id,
    processed: newProcessedCount,
    total: batch.total_prospects,
  })

  // Check if batch is complete
  if (newProcessedCount >= batch.total_prospects) {
    const avgScore = currentScores.reduce((a: number, b: number) => a + b, 0) / currentScores.length
    const highScoreCount = currentScores.filter((s: number) => s >= 80).length

    logger.info('Batch completed', {
      batchId: batch_id,
      totalProspects: batch.total_prospects,
      averageScore: avgScore,
      highScoreCount,
    })

    // Send completion notification to Slack
    await sendSlackBatchComplete(batch_id, batch.total_prospects, highScoreCount, avgScore)

    // Emit batch completed event
    await emit({
      topic: 'batch.completed',
      data: {
        batch_id,
        total_prospects: batch.total_prospects,
        average_score: avgScore,
        high_score_count: highScoreCount,
        completed_at: new Date().toISOString(),
      },
    })

    // Clean up scores state
    await state.delete('batch_scores', batchScoresKey)
  }
}
