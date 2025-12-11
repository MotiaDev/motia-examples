import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { Plan } from '../../src/services/planner/types'

/**
 * Plan Terminal Events Handler
 * 
 * Handles all terminal/final events from the planning workflow.
 * Provides logging, callback notifications, and cleanup for:
 * - Plan completion
 * - Plan failures
 * - Synthesis failures
 * - Re-planning events
 */

const inputSchema = z.object({
  planId: z.string(),
  summary: z.string().optional(),
  tasksCompleted: z.number().optional(),
  tasksFailed: z.number().optional(),
  totalDurationMs: z.number().optional(),
  error: z.string().optional(),
  reason: z.string().optional(),
  taskId: z.string().optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'PlanTerminalEvents',
  description: 'Handles all terminal plan events for logging and callbacks',
  subscribes: [
    'plan.completed',
    'plan.failed',
    'plan.synthesis.failed',
    'plan.replanned',
    'plan.generation.failed',
  ],
  emits: [],
  input: inputSchema,
  flows: ['intelligent-planner'],
}

export const handler: Handlers['PlanTerminalEvents'] = async (input, { logger, state, traceId }) => {
  const { planId, error, reason, summary } = input

  // Determine event type from the data
  const eventType = error ? 'failure' : summary ? 'completion' : reason ? 'replanned' : 'unknown'

  logger.info('Terminal event received', {
    planId,
    eventType,
    traceId,
  })

  // Get plan for callback URL
  const plan = await state.get<Plan>('plans', planId)
  const callback = await state.get<{ url: string }>('plan-callbacks', planId)

  // Send callback if configured
  if (callback?.url) {
    try {
      await fetch(callback.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          eventType,
          status: plan?.status,
          ...input,
          timestamp: new Date().toISOString(),
        }),
      })
      logger.info('Callback sent for terminal event', { planId, eventType })
    } catch (callbackError) {
      logger.warn('Failed to send terminal event callback', {
        planId,
        error: callbackError instanceof Error ? callbackError.message : String(callbackError),
      })
    }
  }

  // Log final state
  if (error) {
    logger.error('Plan ended with error', { planId, error, reason })
  } else if (summary) {
    logger.info('Plan completed successfully', { planId, summary })
  } else if (reason) {
    logger.info('Plan was replanned', { planId, reason })
  }
}

