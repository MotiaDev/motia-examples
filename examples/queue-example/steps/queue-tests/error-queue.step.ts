import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  timestamp: z.string(),
  traceId: z.string(),
  testName: z.string(),
  shouldFail: z.boolean(),
  failureCount: z.number().optional().default(2), // Number of times to fail before succeeding
  errorType: z.enum(['throw', 'reject', 'timeout', 'validation', 'permanent']).optional().default('throw'),
  customPayload: z.record(z.string(), z.any()).optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'ErrorQueueTest',
  description: '🔄 Production-ready error handling with automatic retry (exponential backoff) and DLQ routing. Demonstrates how transient failures recover automatically while permanent failures route to Dead Letter Queue for manual intervention.',
  flows: ['queue-tests'],
  subscribes: ['queue-test.error'],
  emits: ['queue-test.dlq'], // Emit to DLQ for permanent failures
  input: inputSchema,
  // Note: Retry behavior (maxRetries, retryDelay, backoffMultiplier) is configured at the BullMQ adapter level
  // The handler simulates retry attempts and demonstrates exponential backoff behavior
}

export const handler: Handlers['ErrorQueueTest'] = async (input, { traceId, logger, state, emit }) => {
  const startTime = Date.now()
  const failureCount = input.failureCount || 2
  
  logger.info('⚠️ Error queue test started', {
    testName: input.testName,
    traceId,
    shouldFail: input.shouldFail,
    errorType: input.errorType,
    failureCount,
  })

  // Track retry attempts (this simulates what the queue system tracks internally)
  const attemptKey = `error-test-attempts-${traceId}`
  const currentAttempts = await state.get<number>('queue-test-attempts', attemptKey) || 0
  const newAttemptCount = currentAttempts + 1
  await state.set('queue-test-attempts', attemptKey, newAttemptCount)

  logger.info('🔄 Retry mechanism in action', {
    traceId,
    attemptNumber: newAttemptCount,
    maxRetries: 3,
    configuredBackoff: 'exponential (1s → 2s → 4s)',
  })

  // Check if this is a permanent failure scenario (should go straight to DLQ)
  if (input.errorType === 'permanent') {
    logger.error('💀 Permanent failure - routing to Dead Letter Queue', {
      traceId,
      reason: 'Unrecoverable error - no retry will help',
    })

    // Emit to DLQ for manual intervention
    await emit({
      topic: 'queue-test.dlq',
      data: {
        originalTopic: 'queue-test.error',
        originalData: input,
        traceId,
        failureReason: 'Permanent failure - marked as unrecoverable',
        attemptCount: newAttemptCount,
        failedAt: new Date().toISOString(),
        canRetry: false,
      },
    })

    // Store DLQ entry
    await state.set('queue-test-dlq', `dlq-${traceId}`, {
      originalTopic: 'queue-test.error',
      originalData: input,
      traceId,
      failureReason: 'Permanent failure',
      attemptCount: newAttemptCount,
      status: 'in-dlq',
      failedAt: new Date().toISOString(),
    })

    return // Don't throw - we handled it by routing to DLQ
  }

  // Fail for the configured number of attempts, then succeed
  const shouldActuallyFail = input.shouldFail && newAttemptCount <= failureCount

  if (shouldActuallyFail) {
    const errorType = input.errorType || 'throw'
    
    logger.warn('💥 Simulating transient failure (retry will be attempted)', {
      traceId,
      attemptNumber: newAttemptCount,
      remainingRetries: 3 - newAttemptCount,
      errorType,
      nextRetryIn: `${Math.pow(2, newAttemptCount - 1) * 1000}ms (exponential backoff)`,
    })

    // Store failed attempt for visibility
    await state.set('queue-test-results', `error-attempt-${traceId}-${newAttemptCount}`, {
      testType: 'error-retry',
      traceId,
      attemptNumber: newAttemptCount,
      errorType,
      status: 'failed-will-retry',
      failedAt: new Date().toISOString(),
      nextRetryExpected: new Date(Date.now() + Math.pow(2, newAttemptCount - 1) * 1000).toISOString(),
    })

    switch (errorType) {
      case 'throw':
        throw new Error(`Transient error on attempt ${newAttemptCount}/${failureCount + 1} - queue will retry automatically`)
      
      case 'reject':
        return Promise.reject(new Error(`Transient rejection on attempt ${newAttemptCount} - queue will retry`))
      
      case 'timeout':
        logger.warn('⏰ Simulating timeout scenario', { traceId, timeoutMs: 30000 })
        await new Promise(resolve => setTimeout(resolve, 30000))
        break
      
      case 'validation':
        throw new Error(`Validation error on attempt ${newAttemptCount} - will retry with same data`)
      
      default:
        throw new Error(`Unknown error type: ${errorType}`)
    }
  }

  const processingTime = Date.now() - startTime

  logger.info('✅ Error queue test RECOVERED after retries!', {
    testName: input.testName,
    traceId,
    totalAttempts: newAttemptCount,
    failuresBeforeSuccess: newAttemptCount - 1,
    processingTimeMs: processingTime,
    message: 'This demonstrates the retry mechanism working correctly!',
  })

  // Store successful result showing retry recovery
  await state.set('queue-test-results', `error-${traceId}`, {
    testType: 'error-recovery',
    traceId,
    totalAttempts: newAttemptCount,
    failuresBeforeSuccess: newAttemptCount - 1,
    processingTimeMs: processingTime,
    status: 'recovered',
    recoveryMessage: `Successfully recovered after ${newAttemptCount - 1} failed attempts`,
    completedAt: new Date().toISOString(),
  })

  // Clean up attempt counter
  await state.delete('queue-test-attempts', attemptKey)
}

