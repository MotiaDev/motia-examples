import { CronConfig, Handlers } from 'motia'
import { todoService } from '../services/todo.service'

/**
 * Daily Stats Cron Step
 *
 * Runs every hour to generate and store todo statistics.
 * Useful for dashboards and reporting.
 *
 * In production, this could:
 * - Send daily reports via email
 * - Update external dashboards
 * - Sync with business intelligence tools
 */

export const config: CronConfig = {
  type: 'cron',
  name: 'DailyStatsCron',
  description: 'Generates hourly todo statistics snapshots',
  cron: '0 * * * *', // Every hour
  flows: ['todo-app'],
  emits: [],
  includeFiles: ['../services/todo.service.ts', '../services/todo-types.ts'],
}

export const handler: Handlers['DailyStatsCron'] = async ({ logger, state }) => {
  logger.info('Generating todo statistics snapshot')

  const stats = await todoService.getStats(state)

  const snapshot = {
    ...stats,
    timestamp: new Date().toISOString(),
    completionRate: stats.total > 0 ? Math.round(((stats.completed + stats.archived) / stats.total) * 100) : 0,
  }

  // Store snapshot with timestamp key
  const snapshotKey = `stats-${new Date().toISOString().replace(/[:.]/g, '-')}`
  await state.set('stats-snapshots', snapshotKey, snapshot)

  logger.info('Statistics snapshot generated', snapshot)
}

