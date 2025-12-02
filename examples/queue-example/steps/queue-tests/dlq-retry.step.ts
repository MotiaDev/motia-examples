import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * 🔥 DLQ RECOVERY API - Retry failed messages from Dead Letter Queue
 * 
 * Production feature: Manually recover failed messages after fixing the root cause
 */

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'RetryDeadLetterEntry',
  description: '🔄 Retry a message from the Dead Letter Queue',
  flows: ['queue-tests'],
  method: 'POST',
  path: '/queue-tests/dlq/retry/:id',
  bodySchema: z.object({
    modifiedData: z.record(z.string(), z.any()).optional().describe('Optional modified payload for retry'),
    resetAttemptCount: z.boolean().optional().default(true).describe('Reset attempt counter for fresh retry'),
  }),
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      retriedEntry: z.object({
        id: z.string(),
        originalTopic: z.string(),
        status: z.string(),
      }),
    }),
    404: z.object({ error: z.string() }),
    400: z.object({ error: z.string() }),
  },
  emits: [
    'queue-test.simple',
    'queue-test.chain-start',
    'queue-test.parallel',
    'queue-test.heavy',
    'queue-test.state',
    'queue-test.error',
  ],
}

export const handler: Handlers['RetryDeadLetterEntry'] = async (req, { logger, state, emit }) => {
  const { id } = req.pathParams
  const body = req.body || {}
  const { modifiedData, resetAttemptCount = true } = body

  logger.info('🔄 Attempting DLQ retry', { entryId: id, hasModifiedData: !!modifiedData })

  // Find the DLQ entry
  const entry = await state.get<{
    id: string
    originalTopic: string
    originalData: any
    traceId: string
    failureReason: string
    attemptCount: number
    status: string
    arrivedInDlqAt: string
    canRetry: boolean
  }>('queue-test-dlq', id)

  if (!entry) {
    logger.warn('❌ DLQ entry not found', { entryId: id })
    return {
      status: 404,
      body: { error: `DLQ entry not found: ${id}` },
    }
  }

  if (!entry.canRetry) {
    logger.warn('❌ DLQ entry marked as non-retryable', { entryId: id, reason: entry.failureReason })
    return {
      status: 400,
      body: { error: 'This entry is marked as non-retryable (permanent failure)' },
    }
  }

  // Prepare the data for retry
  const retryData = modifiedData 
    ? { ...entry.originalData, ...modifiedData }
    : entry.originalData

  // Reset attempt counter if requested
  if (resetAttemptCount && entry.originalData?.traceId) {
    const attemptKey = `error-test-attempts-${entry.originalData.traceId}`
    await state.delete('queue-test-attempts', attemptKey)
    logger.info('🔄 Reset attempt counter for fresh retry', { attemptKey })
  }

  // Update DLQ entry status
  await state.set('queue-test-dlq', id, {
    ...entry,
    status: 'retrying',
    retryInitiatedAt: new Date().toISOString(),
    modifiedForRetry: !!modifiedData,
  })

  try {
    // Re-emit to the original topic
    await emit({
      topic: entry.originalTopic as 'queue-test.simple' | 'queue-test.chain-start' | 'queue-test.parallel' | 'queue-test.heavy' | 'queue-test.state' | 'queue-test.error',
      data: {
        ...retryData,
        _retryFromDlq: true,
        _dlqEntryId: id,
        _originalFailureReason: entry.failureReason,
      },
    })

    logger.info('✅ DLQ entry re-emitted for retry', {
      entryId: id,
      topic: entry.originalTopic,
      traceId: entry.traceId,
    })

    // Update entry status
    await state.set('queue-test-dlq', id, {
      ...entry,
      status: 'retried',
      retriedAt: new Date().toISOString(),
    })

    return {
      status: 200,
      body: {
        success: true,
        message: `Successfully re-queued message to ${entry.originalTopic}`,
        retriedEntry: {
          id: entry.id,
          originalTopic: entry.originalTopic,
          status: 'retried',
        },
      },
    }
  } catch (error: any) {
    logger.error('❌ Failed to retry DLQ entry', { entryId: id, error: error.message })

    await state.set('queue-test-dlq', id, {
      ...entry,
      status: 'retry-failed',
      retryError: error.message,
      retryFailedAt: new Date().toISOString(),
    })

    return {
      status: 400,
      body: { error: `Failed to retry: ${error.message}` },
    }
  }
}

