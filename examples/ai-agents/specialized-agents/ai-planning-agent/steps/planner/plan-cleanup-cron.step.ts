import { CronConfig, Handlers } from 'motia'
import { Plan, PlanStatus } from '../../src/services/planner/types'

/**
 * Plan Cleanup Cron Step
 * 
 * Runs daily to clean up old plans and archive completed ones.
 * Maintains system health by removing stale data.
 */

export const config: CronConfig = {
  type: 'cron',
  name: 'PlanCleanupCron',
  description: 'Daily cleanup of old and completed plans',
  cron: '0 2 * * *', // Run at 2 AM daily
  flows: ['intelligent-planner'],
  emits: [],
}

export const handler: Handlers['PlanCleanupCron'] = async ({ logger, state }) => {
  logger.info('Starting plan cleanup job')

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get all plans
  const allPlans = await state.getGroup<Plan>('plans')
  
  let archived = 0
  let cleaned = 0

  for (const plan of allPlans) {
    const planDate = new Date(plan.createdAt)

    // Archive completed plans older than 7 days
    if (
      plan.status === PlanStatus.COMPLETED &&
      planDate < sevenDaysAgo
    ) {
      // Move to archive (in production, this would go to cold storage)
      await state.set('plans-archive', plan.id, {
        ...plan,
        archivedAt: now.toISOString(),
      })
      await state.delete('plans', plan.id)
      archived++
      logger.info('Plan archived', { planId: plan.id })
    }

    // Clean up failed/cancelled plans older than 30 days
    if (
      (plan.status === PlanStatus.FAILED || plan.status === PlanStatus.CANCELLED) &&
      planDate < thirtyDaysAgo
    ) {
      await state.delete('plans', plan.id)
      await state.delete('plan-executions', plan.id)
      await state.delete('plan-reports', plan.id)
      cleaned++
      logger.info('Plan cleaned up', { planId: plan.id, status: plan.status })
    }
  }

  // Clean up orphaned execution states
  const allExecutions = await state.getGroup<any>('plan-executions')
  const planIds = new Set(allPlans.map(p => p.id))
  
  let orphansRemoved = 0
  for (const execution of allExecutions) {
    if (!planIds.has(execution.planId)) {
      await state.delete('plan-executions', execution.planId)
      orphansRemoved++
    }
  }

  logger.info('Plan cleanup completed', {
    totalPlans: allPlans.length,
    archived,
    cleaned,
    orphansRemoved,
  })
}

