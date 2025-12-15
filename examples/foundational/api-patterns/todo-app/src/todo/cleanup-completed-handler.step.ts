import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Cleanup Completed Handler Event Step
 *
 * Handles the cleanup-completed event from the cron job.
 * Logs cleanup activities for monitoring.
 */

const inputSchema = z.object({
  archivedCount: z.number(),
  durationMs: z.number(),
  runAt: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'CleanupCompletedHandler',
  description: 'Logs cleanup completion for monitoring',
  subscribes: ['cleanup-completed'],
  flows: ['todo-app'],
  input: inputSchema,
  emits: [],
}

export const handler: Handlers['CleanupCompletedHandler'] = async (input, { logger, state }) => {
  const { archivedCount, durationMs, runAt } = input

  logger.info('Cleanup job completed', { archivedCount, durationMs, runAt })

  // Store in maintenance log
  const logEntry = {
    type: 'cleanup',
    archivedCount,
    durationMs,
    runAt,
    loggedAt: new Date().toISOString(),
  }

  await state.set('maintenance-logs', `cleanup-${Date.now()}`, logEntry)

  // Update running totals
  const totalsKey = 'cleanup-totals'
  const existingTotals = await state.get<{ totalArchived: number; runs: number }>('maintenance-aggregates', totalsKey)

  await state.set('maintenance-aggregates', totalsKey, {
    totalArchived: (existingTotals?.totalArchived ?? 0) + archivedCount,
    runs: (existingTotals?.runs ?? 0) + 1,
    lastRun: runAt,
  })

  logger.info('Cleanup activity logged')
}

