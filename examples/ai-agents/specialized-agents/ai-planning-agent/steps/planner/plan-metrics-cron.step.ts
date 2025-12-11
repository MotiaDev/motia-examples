import { CronConfig, Handlers } from 'motia'
import { Plan, PlanStatus, PlanExecutionState } from '../../src/services/planner/types'

/**
 * Plan Metrics Cron Step
 * 
 * Runs every 5 minutes to calculate and update system metrics.
 * Provides observability into planning system health.
 */

export const config: CronConfig = {
  type: 'cron',
  name: 'PlanMetricsCron',
  description: 'Calculate and store planning system metrics',
  cron: '*/5 * * * *', // Every 5 minutes
  flows: ['intelligent-planner'],
  emits: [],
}

export const handler: Handlers['PlanMetricsCron'] = async ({ logger, state }) => {
  logger.info('Calculating plan metrics')

  const allPlans = await state.getGroup<Plan>('plans')
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Calculate metrics
  const metrics = {
    timestamp: now.toISOString(),
    
    // Total counts by status
    totalPlans: allPlans.length,
    byStatus: {
      pending: 0,
      planning: 0,
      executing: 0,
      blocked: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    },

    // Time-based metrics
    lastHour: {
      created: 0,
      completed: 0,
      failed: 0,
    },
    lastDay: {
      created: 0,
      completed: 0,
      failed: 0,
    },

    // Performance metrics
    averageTaskCount: 0,
    averageCompletionTimeMs: 0,
    successRate: 0,
  }

  let totalTasks = 0
  let totalCompletionTime = 0
  let completedPlans = 0

  for (const plan of allPlans) {
    // Count by status
    const status = plan.status as keyof typeof metrics.byStatus
    if (metrics.byStatus[status] !== undefined) {
      metrics.byStatus[status]++
    }

    // Time-based counts
    const createdAt = new Date(plan.createdAt)
    if (createdAt >= oneHourAgo) {
      metrics.lastHour.created++
    }
    if (createdAt >= oneDayAgo) {
      metrics.lastDay.created++
    }

    // Completed plans
    if (plan.status === PlanStatus.COMPLETED && plan.completedAt) {
      const completedAt = new Date(plan.completedAt)
      if (completedAt >= oneHourAgo) {
        metrics.lastHour.completed++
      }
      if (completedAt >= oneDayAgo) {
        metrics.lastDay.completed++
      }

      // Completion time
      const duration = completedAt.getTime() - createdAt.getTime()
      totalCompletionTime += duration
      completedPlans++
    }

    // Failed plans
    if (plan.status === PlanStatus.FAILED) {
      const updatedAt = new Date(plan.updatedAt)
      if (updatedAt >= oneHourAgo) {
        metrics.lastHour.failed++
      }
      if (updatedAt >= oneDayAgo) {
        metrics.lastDay.failed++
      }
    }

    // Task count
    totalTasks += plan.tasks.length
  }

  // Calculate averages
  metrics.averageTaskCount = allPlans.length > 0 
    ? Math.round(totalTasks / allPlans.length) 
    : 0

  metrics.averageCompletionTimeMs = completedPlans > 0 
    ? Math.round(totalCompletionTime / completedPlans) 
    : 0

  const totalFinished = metrics.byStatus.completed + metrics.byStatus.failed
  metrics.successRate = totalFinished > 0 
    ? Math.round((metrics.byStatus.completed / totalFinished) * 100) 
    : 100

  // Store metrics
  await state.set('metrics', 'current', metrics)

  // Store historical metrics (keep last 24 hours)
  const historyKey = `history-${now.toISOString().slice(0, 13)}` // Hourly bucket
  await state.set('metrics', historyKey, metrics)

  logger.info('Metrics calculated', {
    totalPlans: metrics.totalPlans,
    successRate: metrics.successRate,
    lastHourCreated: metrics.lastHour.created,
    lastHourCompleted: metrics.lastHour.completed,
  })
}

