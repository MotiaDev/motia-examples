import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware'
import { Plan, PlanExecutionState, StepStatus } from '../../src/services/planner/types'

/**
 * POST /plans/:id/tasks/:taskId/approve
 * 
 * Approve a task that requires human approval.
 * This allows the executor to continue with the approved task.
 */

const bodySchema = z.object({
  approved: z.boolean(),
  approvedBy: z.string(),
  notes: z.string().optional(),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ApproveTaskApi',
  description: 'Approve or reject a task requiring human intervention',
  path: '/plans/:id/tasks/:taskId/approve',
  method: 'POST',
  flows: ['intelligent-planner'],
  middleware: [errorHandlerMiddleware],
  bodySchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
    404: z.object({ error: z.string() }),
    400: z.object({ error: z.string() }),
  },
  emits: [
    { topic: 'plan.step.completed', label: 'Continue execution', conditional: true },
  ],
  virtualSubscribes: ['plan.escalation.required'],
}

export const handler: Handlers['ApproveTaskApi'] = async (req, { emit, logger, state }) => {
  const { id: planId, taskId } = req.pathParams
  const { approved, approvedBy, notes } = bodySchema.parse(req.body)

  logger.info('Processing task approval', { planId, taskId, approved, approvedBy })

  // Retrieve plan
  const plan = await state.get<Plan>('plans', planId)
  if (!plan) {
    return {
      status: 404,
      body: { error: 'Plan not found' },
    }
  }

  // Find the task
  const task = plan.tasks.find(t => t.id === taskId)
  if (!task) {
    return {
      status: 404,
      body: { error: 'Task not found in plan' },
    }
  }

  // Store approval decision
  await state.set('plan-approvals', `${planId}:${taskId}`, {
    approved,
    approvedBy,
    notes,
    decidedAt: new Date().toISOString(),
  })

  // Update execution state
  const executionState = await state.get<PlanExecutionState>('plan-executions', planId)
  if (executionState && executionState.results[taskId]) {
    if (approved) {
      // Clear waiting status
      delete executionState.results[taskId]
    } else {
      // Mark as failed due to rejection
      executionState.results[taskId] = {
        taskId,
        status: StepStatus.FAILED,
        startedAt: executionState.results[taskId].startedAt,
        completedAt: new Date().toISOString(),
        error: `Rejected by ${approvedBy}${notes ? `: ${notes}` : ''}`,
        retryAttempt: 0,
      }
      executionState.failedTasks.push(taskId)
    }
    await state.set('plan-executions', planId, executionState)
  }

  if (approved) {
    logger.info('Task approved, continuing execution', { planId, taskId })

    // Trigger executor to continue
    await emit({
      topic: 'plan.step.completed',
      data: { planId },
    })

    return {
      status: 200,
      body: {
        success: true,
        message: `Task ${taskId} approved. Execution will continue.`,
      },
    }
  } else {
    logger.info('Task rejected', { planId, taskId, reason: notes })

    return {
      status: 200,
      body: {
        success: true,
        message: `Task ${taskId} rejected. Plan execution halted.`,
      },
    }
  }
}

