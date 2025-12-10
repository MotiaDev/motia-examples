import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * 🔥 DEAD LETTER QUEUE LISTENER
 * 
 * This step actively listens to the DLQ and processes failed messages.
 * In production, this could:
 * 1. Automatically retry certain types of failures
 * 2. Route to different handlers based on failure type
 * 3. Send notifications/alerts
 * 4. Perform automated recovery actions
 * 5. Archive old DLQ entries
 */

const listenerInputSchema = z.object({
  originalTopic: z.string(),
  originalData: z.any(),
  traceId: z.string(),
  failureReason: z.string(),
  attemptCount: z.number(),
  failedAt: z.string(),
  canRetry: z.boolean().optional().default(true),
  errorStack: z.string().optional(),
  dlqEntryId: z.string(), // Added by dlq-handler
})

export const config: EventConfig = {
  type: 'event',
  name: 'DeadLetterQueueListener',
  description: '🔍 DLQ Listener - Automatically processes messages from Dead Letter Queue. Can perform automated recovery, routing, or alerting based on failure patterns.',
  flows: ['queue-tests'],
  subscribes: ['queue-test.dlq.processed'], // Subscribe to processed DLQ entries from handler
  emits: [
    'queue-test.simple',
    'queue-test.chain-start',
    'queue-test.parallel',
    'queue-test.heavy',
    'queue-test.state',
    'queue-test.error',
  ],
  input: listenerInputSchema,
}

export const handler: Handlers['DeadLetterQueueListener'] = async (input, { traceId, logger, state, emit }) => {
  logger.info('🔍 DLQ Listener processing failed message', {
    originalTopic: input.originalTopic,
    traceId: input.traceId,
    failureReason: input.failureReason,
    attemptCount: input.attemptCount,
    canRetry: input.canRetry,
  })

  // Analyze the failure to determine action
  const failureAnalysis = {
    isTransient: input.failureReason.toLowerCase().includes('timeout') || 
                 input.failureReason.toLowerCase().includes('network') ||
                 input.failureReason.toLowerCase().includes('temporary'),
    isPermanent: input.failureReason.toLowerCase().includes('permanent') ||
                 input.failureReason.toLowerCase().includes('invalid') ||
                 input.failureReason.toLowerCase().includes('validation'),
    isRecoverable: input.canRetry && input.attemptCount < 5,
  }

  logger.info('📊 Failure analysis', {
    traceId: input.traceId,
    analysis: failureAnalysis,
  })

  // Use the DLQ entry ID from handler (already stored)
  const dlqEntryId = input.dlqEntryId || `dlq-${input.traceId}-${Date.now()}`
  
  // Base entry data to preserve across all status updates
  const baseEntryData = {
    id: dlqEntryId,
    originalTopic: input.originalTopic,
    originalData: input.originalData,
    traceId: input.traceId,
    failureReason: input.failureReason,
    attemptCount: input.attemptCount,
    failedAt: input.failedAt,
    arrivedInDlqAt: new Date().toISOString(),
    canRetry: input.canRetry,
    processedByListener: true,
    failureAnalysis,
  }

  // Decision logic for automated handling
  if (failureAnalysis.isRecoverable && failureAnalysis.isTransient) {
    logger.info('🔄 Attempting automated retry for transient failure', {
      traceId: input.traceId,
      originalTopic: input.originalTopic,
    })

    // Wait a bit before retry (exponential backoff simulation)
    const retryDelay = Math.min(1000 * Math.pow(2, input.attemptCount), 30000)
    logger.info(`⏳ Waiting ${retryDelay}ms before automated retry`, { traceId: input.traceId })

    // Update status - preserve all base data
    await state.set('queue-test-dlq', dlqEntryId, {
      ...baseEntryData,
      status: 'auto-retrying',
      retryScheduledAt: new Date(Date.now() + retryDelay).toISOString(),
    })

    // Re-emit to original topic for retry
    const retryData = typeof input.originalData === 'object' && input.originalData !== null
      ? { ...input.originalData as Record<string, any> }
      : {}
    
    // Add retry metadata to customPayload if it exists, otherwise create it
    const dataWithMetadata = {
      ...retryData,
      customPayload: {
        ...(retryData.customPayload || {}),
        _autoRetryFromDlq: true,
        _dlqEntryId: dlqEntryId,
        _originalFailureReason: input.failureReason,
        _retryAttempt: input.attemptCount + 1,
      },
    }
    
    await emit({
      topic: input.originalTopic as 'queue-test.simple' | 'queue-test.chain-start' | 'queue-test.parallel' | 'queue-test.heavy' | 'queue-test.state' | 'queue-test.error',
      data: dataWithMetadata as any, // Type assertion needed due to dynamic topic routing
    })

    logger.info('✅ Automated retry initiated', {
      traceId: input.traceId,
      originalTopic: input.originalTopic,
      retryAttempt: input.attemptCount + 1,
    })

    return
  }

  if (failureAnalysis.isPermanent) {
    logger.warn('☠️ Permanent failure detected - requires manual intervention', {
      traceId: input.traceId,
      failureReason: input.failureReason,
    })

    // Update status - preserve all base data
    await state.set('queue-test-dlq', dlqEntryId, {
      ...baseEntryData,
      status: 'requires-manual-review',
      requiresManualIntervention: true,
      reason: 'Permanent failure detected',
    })

    // In production, you would:
    // 1. Send alert to on-call engineer
    // 2. Create incident ticket
    // 3. Send to Slack/PagerDuty
    // 4. Trigger escalation workflow

    logger.info('📢 Permanent failure flagged for manual review', {
      traceId: input.traceId,
      dlqEntryId,
    })

    return
  }

  // Default: Mark for review - preserve all base data
  logger.info('📋 DLQ entry marked for review', {
    traceId: input.traceId,
    dlqEntryId,
    status: 'pending-review',
  })

  await state.set('queue-test-dlq', dlqEntryId, {
    ...baseEntryData,
    status: 'pending-review',
    reviewedAt: null,
  })
}

