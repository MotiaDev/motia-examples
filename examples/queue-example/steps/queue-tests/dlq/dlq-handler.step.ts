import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * 🔥 DEAD LETTER QUEUE (DLQ) HANDLER
 * 
 * This step receives messages that have exhausted all retry attempts
 * or have been marked as permanently failed.
 * 
 * In production, DLQ handlers typically:
 * 1. Log detailed failure information for debugging
 * 2. Send alerts to ops teams (PagerDuty, Slack, etc.)
 * 3. Store failed messages for later analysis
 * 4. Provide a mechanism for manual retry/recovery
 */

const inputSchema = z.object({
  originalTopic: z.string(),
  originalData: z.any(),
  traceId: z.string(),
  failureReason: z.string(),
  attemptCount: z.number(),
  failedAt: z.string(),
  canRetry: z.boolean().optional().default(true),
  errorStack: z.string().optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'DeadLetterQueueHandler',
  description: '☠️ Dead Letter Queue Handler - Captures permanently failed messages after all retries exhausted. In production, this would trigger alerts (Slack/PagerDuty) and store failures for manual review and recovery.',
  flows: ['queue-tests'],
  subscribes: ['queue-test.dlq'],
  emits: ['queue-test.dlq.processed'], // Emit to next step for automated processing
  input: inputSchema,
}

export const handler: Handlers['DeadLetterQueueHandler'] = async (input, { traceId, logger, state, emit }) => {
  logger.error('☠️ ═══════════════════════════════════════════════════════════════', {})
  logger.error('☠️ MESSAGE ARRIVED IN DEAD LETTER QUEUE', {
    originalTopic: input.originalTopic,
    traceId: input.traceId,
    attemptCount: input.attemptCount,
    failureReason: input.failureReason,
  })
  logger.error('☠️ ═══════════════════════════════════════════════════════════════', {})

  // Store in DLQ state for management and recovery
  const dlqEntry = {
    id: `dlq-${input.traceId}-${Date.now()}`,
    originalTopic: input.originalTopic,
    originalData: input.originalData,
    traceId: input.traceId,
    failureReason: input.failureReason,
    attemptCount: input.attemptCount,
    failedAt: input.failedAt,
    arrivedInDlqAt: new Date().toISOString(),
    canRetry: input.canRetry,
    status: 'pending-review',
    errorStack: input.errorStack,
  }

  await state.set('queue-test-dlq', dlqEntry.id, dlqEntry)

  // Update DLQ statistics
  const statsKey = 'dlq-stats'
  const currentStats = await state.get<{
    totalCount: number
    byTopic: Record<string, number>
    lastUpdated: string
  }>('queue-test-stats', statsKey) || {
    totalCount: 0,
    byTopic: {},
    lastUpdated: new Date().toISOString(),
  }

  currentStats.totalCount++
  currentStats.byTopic[input.originalTopic] = (currentStats.byTopic[input.originalTopic] || 0) + 1
  currentStats.lastUpdated = new Date().toISOString()

  await state.set('queue-test-stats', statsKey, currentStats)

  logger.warn('📊 DLQ Statistics Updated', {
    totalInDlq: currentStats.totalCount,
    byTopic: currentStats.byTopic,
  })

  // In production, you would:
  // 1. Send alert to Slack/PagerDuty
  // 2. Create incident ticket
  // 3. Trigger automated recovery if possible
  
  logger.info('💡 DLQ Entry stored - Use /queue-tests/dlq endpoints to manage', {
    entryId: dlqEntry.id,
    canRetry: input.canRetry,
    recoveryEndpoint: 'POST /queue-tests/dlq/retry/:id',
  })

  // Emit to listener for automated processing
  await emit({
    topic: 'queue-test.dlq.processed',
    data: {
      ...input,
      dlqEntryId: dlqEntry.id,
    },
  })
}

