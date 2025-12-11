import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware'
import {
  planStatusResponseSchema,
  errorResponseSchema,
  Plan,
  PlanExecutionState,
  SynthesisReport,
  StepStatus,
} from '../../src/services/planner/types'

/**
 * GET /plans/:id
 * 
 * Query plan status with real-time progress information.
 * Returns plan details, execution state, and visual timeline.
 */

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetPlanStatusApi',
  description: 'Get the status and progress of a plan execution',
  path: '/plans/:id',
  method: 'GET',
  flows: ['intelligent-planner'],
  middleware: [errorHandlerMiddleware],
  responseSchema: {
    200: planStatusResponseSchema,
    404: errorResponseSchema,
  },
  emits: [],
  virtualSubscribes: ['plan.completed'],
}

export const handler: Handlers['GetPlanStatusApi'] = async (req, { logger, state, traceId }) => {
  const { id: planId } = req.pathParams

  logger.info('Fetching plan status', { planId })

  // Retrieve plan from state
  const plan = await state.get<Plan>('plans', planId)

  if (!plan) {
    logger.warn('Plan not found', { planId })
    return {
      status: 404,
      body: {
        error: 'Plan not found',
        code: 'PLAN_NOT_FOUND',
      },
    }
  }

  // Retrieve execution state
  const executionState = await state.get<PlanExecutionState>('plan-executions', planId)

  // Retrieve synthesis report if completed
  const report = plan.status === 'completed' 
    ? await state.get<SynthesisReport>('plan-reports', planId)
    : undefined

  // Build timeline for visualization
  const timeline = plan.tasks.map(task => {
    const result = executionState?.results[task.id]
    
    let status: StepStatus = StepStatus.QUEUED
    if (result) {
      status = result.status
    } else if (executionState?.completedTasks.includes(task.id)) {
      status = StepStatus.COMPLETED
    } else if (executionState?.failedTasks.includes(task.id)) {
      status = StepStatus.FAILED
    } else if (plan.currentTaskIndex > plan.tasks.findIndex(t => t.id === task.id)) {
      status = StepStatus.COMPLETED
    } else if (plan.currentTaskIndex === plan.tasks.findIndex(t => t.id === task.id)) {
      status = StepStatus.IN_PROGRESS
    }

    return {
      taskId: task.id,
      taskName: task.name,
      status,
      startedAt: result?.startedAt,
      completedAt: result?.completedAt,
    }
  })

  logger.info('Returning plan status', { 
    planId, 
    status: plan.status,
    tasksTotal: plan.tasks.length,
    tasksCompleted: executionState?.completedTasks.length || 0,
  })

  return {
    status: 200,
    body: {
      plan,
      executionState: executionState || undefined,
      report: report || undefined,
      timeline,
    },
  }
}

