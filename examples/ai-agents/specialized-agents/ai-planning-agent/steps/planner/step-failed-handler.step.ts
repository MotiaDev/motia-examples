import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { llmService } from '../../src/services/planner/llm-service'
import { Plan, PlanStatus, PlanExecutionState } from '../../src/services/planner/types'

/**
 * Step Failed Handler Event Step
 * 
 * Handles task failures with intelligent re-planning.
 * Can trigger the Planner to generate alternative approaches
 * or escalate to human intervention.
 */

const inputSchema = z.object({
  planId: z.string(),
  taskId: z.string(),
  error: z.string().optional(),
  retryAttempt: z.number().optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'StepFailedHandler',
  description: 'Handles task failures with re-planning or escalation',
  subscribes: ['plan.step.failed'],
  emits: [
    { topic: 'plan.replanned', label: 'Plan updated after failure', conditional: true },
    { topic: 'plan.step.completed', label: 'Continue after replan', conditional: true },
    { topic: 'plan.escalation.required', label: 'Human intervention needed', conditional: true },
    { topic: 'plan.failed', label: 'Plan terminally failed', conditional: true },
  ],
  input: inputSchema,
  flows: ['intelligent-planner'],
}

export const handler: Handlers['StepFailedHandler'] = async (input, { emit, logger, state }) => {
  const { planId, taskId, error, retryAttempt } = input

  logger.info('Handling step failure', { planId, taskId, error, retryAttempt })

  const plan = await state.get<Plan>('plans', planId)
  const executionState = await state.get<PlanExecutionState>('plan-executions', planId)

  if (!plan || !executionState) {
    logger.error('Plan or execution state not found for failure handling', { planId })
    return
  }

  const failedTask = plan.tasks.find(t => t.id === taskId)
  if (!failedTask) {
    logger.error('Failed task not found in plan', { planId, taskId })
    return
  }

  // Determine failure severity and response
  const failureAnalysis = analyzeFailure(error || '', failedTask, executionState)

  if (failureAnalysis.canReplan) {
    logger.info('Attempting to re-plan after failure', { planId, taskId })

    try {
      // Use LLM to generate alternative plan
      const newTasks = await llmService.replan(
        plan,
        taskId,
        error || 'Task execution failed',
        { failedAttempts: retryAttempt }
      )

      // Update plan with new tasks
      const updatedPlan: Plan = {
        ...plan,
        tasks: newTasks,
        status: PlanStatus.EXECUTING,
        updatedAt: new Date().toISOString(),
      }

      await state.set('plans', planId, updatedPlan)

      // Reset execution state for new tasks
      const updatedExecutionState: PlanExecutionState = {
        ...executionState,
        failedTasks: executionState.failedTasks.filter(id => id !== taskId),
      }
      await state.set('plan-executions', planId, updatedExecutionState)

      logger.info('Plan successfully re-planned', { 
        planId, 
        newTaskCount: newTasks.length,
      })

      await emit({
        topic: 'plan.replanned',
        data: { planId, reason: 'Task failure handled with alternative approach' },
      })

      // Continue execution
      await emit({
        topic: 'plan.step.completed',
        data: { planId },
      })

    } catch (replanError) {
      logger.error('Re-planning failed', { 
        planId, 
        error: replanError instanceof Error ? replanError.message : String(replanError),
      })

      // Fall through to escalation
      await escalatePlan(planId, taskId, error || '', plan, state, emit, logger)
    }

  } else if (failureAnalysis.requiresEscalation) {
    await escalatePlan(planId, taskId, error || '', plan, state, emit, logger)

  } else {
    // Terminal failure - mark plan as failed
    logger.error('Plan failed terminally', { planId, taskId, error })

    await state.set('plans', planId, {
      ...plan,
      status: PlanStatus.FAILED,
      updatedAt: new Date().toISOString(),
    })

    await emit({
      topic: 'plan.failed',
      data: {
        planId,
        taskId,
        error,
        reason: failureAnalysis.reason,
      },
    })
  }
}

/**
 * Analyze the failure to determine appropriate response
 */
function analyzeFailure(
  error: string,
  failedTask: any,
  executionState: PlanExecutionState
): { canReplan: boolean; requiresEscalation: boolean; reason: string } {
  const errorLower = error.toLowerCase()

  // Transient errors that might benefit from re-planning
  if (
    errorLower.includes('timeout') ||
    errorLower.includes('rate limit') ||
    errorLower.includes('temporarily unavailable')
  ) {
    return {
      canReplan: true,
      requiresEscalation: false,
      reason: 'Transient error - alternative approach possible',
    }
  }

  // Errors that require human intervention
  if (
    errorLower.includes('permission denied') ||
    errorLower.includes('unauthorized') ||
    errorLower.includes('forbidden') ||
    failedTask.requiresApproval
  ) {
    return {
      canReplan: false,
      requiresEscalation: true,
      reason: 'Authorization or approval required',
    }
  }

  // Check if too many failures
  if (executionState.failedTasks.length >= 3) {
    return {
      canReplan: false,
      requiresEscalation: true,
      reason: 'Multiple task failures - human review required',
    }
  }

  // Default: try to re-plan
  return {
    canReplan: true,
    requiresEscalation: false,
    reason: 'General failure - attempting re-plan',
  }
}

/**
 * Escalate plan to human intervention
 */
async function escalatePlan(
  planId: string,
  taskId: string,
  error: string,
  plan: Plan,
  state: any,
  emit: any,
  logger: any
) {
  logger.warn('Escalating plan for human intervention', { planId, taskId })

  await state.set('plans', planId, {
    ...plan,
    status: PlanStatus.BLOCKED,
    updatedAt: new Date().toISOString(),
  })

  await emit({
    topic: 'plan.escalation.required',
    data: {
      planId,
      taskId,
      error,
      reason: 'Human intervention required to resolve failure',
      stakeholders: plan.metadata?.stakeholders,
    },
  })
}

