/**
 * Stale Data Cleanup Cron Step
 * Cleans up old state data and orphaned records
 */
import { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  name: 'StaleDataCleanup',
  type: 'cron',
  description: 'Cleans up stale state data and orphaned records weekly',
  cron: '0 2 * * 0', // Run every Sunday at 2 AM
  emits: [],
  flows: ['maintenance'],
}

export const handler: Handlers['StaleDataCleanup'] = async ({ logger, state }) => {
  logger.info('Starting stale data cleanup')

  let cleanedRecords = 0
  const STALE_THRESHOLD_DAYS = 30

  // Clean up old batch scores
  try {
    const batchScores = await state.getGroup<any>('batch_scores')
    for (const record of batchScores) {
      // These are temporary and should be cleaned after batch completion
      await state.delete('batch_scores', record.id || record.key)
      cleanedRecords++
    }
    logger.info('Cleaned batch scores', { count: batchScores.length })
  } catch (error: any) {
    logger.warn('Failed to clean batch scores', { error: error.message })
  }

  // Clean up old failures (older than threshold)
  try {
    const failures = await state.getGroup<any>('research_failures')
    const now = new Date()

    for (const failure of failures) {
      if (failure.failed_at) {
        const failedDate = new Date(failure.failed_at)
        const daysSinceFailed = (now.getTime() - failedDate.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysSinceFailed > STALE_THRESHOLD_DAYS) {
          await state.delete('research_failures', failure.id || `${failure.batch_id}_${failure.prospect_id}`)
          cleanedRecords++
        }
      }
    }
    logger.info('Cleaned old failures', { checked: failures.length })
  } catch (error: any) {
    logger.warn('Failed to clean research failures', { error: error.message })
  }

  // Clean up old signals cache (older than threshold)
  try {
    const signals = await state.getGroup<any>('prospect_signals')
    const now = new Date()

    for (const signal of signals) {
      if (signal.collected_at) {
        const collectedDate = new Date(signal.collected_at)
        const daysSinceCollected = (now.getTime() - collectedDate.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysSinceCollected > STALE_THRESHOLD_DAYS) {
          await state.delete('prospect_signals', signal.prospect_id || signal.id)
          cleanedRecords++
        }
      }
    }
    logger.info('Cleaned old signals cache', { checked: signals.length })
  } catch (error: any) {
    logger.warn('Failed to clean signals cache', { error: error.message })
  }

  logger.info('Stale data cleanup complete', { cleanedRecords })
}

