import { CronConfig, Handlers } from 'motia'
import { todoService } from '../services/todo.service'

/**
 * Cleanup Cron Step
 *
 * Runs daily at midnight to archive old completed todos.
 * Demonstrates scheduled background jobs in Motia.
 *
 * Features:
 * - Archives todos completed more than 7 days ago
 * - Logs cleanup statistics
 * - Emits events for auditing
 */

export const config: CronConfig = {
  type: 'cron',
  name: 'TodoCleanupCron',
  description: 'Archives completed todos older than 7 days (runs daily at midnight)',
  cron: '0 0 * * *', // Every day at midnight
  flows: ['todo-app'],
  emits: [{ topic: 'cleanup-completed', label: 'Cleanup Completed' }],
  includeFiles: ['../services/todo.service.ts', '../services/todo-types.ts'],
}

export const handler: Handlers['TodoCleanupCron'] = async ({ logger, emit, state }) => {
  logger.info('Starting todo cleanup job')

  const startTime = Date.now()

  // Calculate cutoff date (7 days ago)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 7)

  logger.info('Archiving todos completed before', { cutoffDate: cutoffDate.toISOString() })

  // Get all completed todos older than cutoff
  const oldTodos = await todoService.getCompletedBefore(cutoffDate, state)

  if (oldTodos.length === 0) {
    logger.info('No old completed todos to archive')
    return
  }

  logger.info('Found old completed todos', { count: oldTodos.length })

  // Archive them
  const archivedCount = await todoService.archiveCompleted(oldTodos.map((t) => t.id), state)

  const duration = Date.now() - startTime

  // Store cleanup stats in state
  const cleanupRecord = {
    runAt: new Date().toISOString(),
    todosArchived: archivedCount,
    durationMs: duration,
    cutoffDate: cutoffDate.toISOString(),
  }

  await state.set('cleanup-history', `cleanup-${Date.now()}`, cleanupRecord)

  // Emit cleanup completed event
  await emit({
    topic: 'cleanup-completed',
    data: {
      archivedCount,
      durationMs: duration,
      runAt: new Date().toISOString(),
    },
  })

  logger.info('Todo cleanup job completed', {
    archivedCount,
    durationMs: duration,
  })
}

