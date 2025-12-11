import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { toolExecutorService } from '../../src/services/planner/tool-executor'
import { 
  Plan, 
  PlanStatus, 
  PlanExecutionState, 
  StepStatus,
  SubTask,
} from '../../src/services/planner/types'

/**
 * Executor Agent Event Step
 * 
 * Triggered by plan.generated or plan.step.completed events.
 * Iterates through the plan step-by-step, executing each sub-task
 * and managing state transitions.
 */

const inputSchema = z.object({
  planId: z.string(),
  taskCount: z.number().optional(),
  firstTaskId: z.string().optional(),
  previousTaskId: z.string().optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'ExecutorAgent',
  description: 'Executes plan tasks step-by-step with tool routing',
  subscribes: ['plan.generated', 'plan.step.completed'],
  emits: [
    { topic: 'plan.step.completed', label: 'Task completed successfully' },
    { topic: 'plan.step.failed', label: 'Task execution failed', conditional: true },
    { topic: 'plan.all.steps.completed', label: 'All tasks complete' },
    { topic: 'plan.escalation.required', label: 'Escalation needed', conditional: true },
  ],
  input: inputSchema,
  flows: ['intelligent-planner'],
}

export const handler: Handlers['ExecutorAgent'] = async (input, { emit, logger, state, traceId }) => {
  const { planId, previousTaskId } = input

  logger.info('Executor agent started', { planId, previousTaskId })

  // Retrieve plan and execution state
  const plan = await state.get<Plan>('plans', planId)
  const executionState = await state.get<PlanExecutionState>('plan-executions', planId)

  if (!plan || !executionState) {
    logger.error('Plan or execution state not found', { planId })
    return
  }

  // Find the next task to execute
  const nextTask = findNextExecutableTask(plan, executionState)

  if (!nextTask) {
    // Check if all tasks are complete
    if (executionState.completedTasks.length === plan.tasks.length) {
      logger.info('All tasks completed, triggering synthesizer', { planId })
      
      await emit({
        topic: 'plan.all.steps.completed',
        data: { planId },
      })
      return
    }

    // Check for blockers
    const blockedTask = findBlockedTask(plan, executionState)
    if (blockedTask) {
      logger.warn('Plan execution blocked', { 
        planId, 
        blockedTask: blockedTask.id,
        failedDependencies: blockedTask.dependsOn.filter(d => 
          executionState.failedTasks.includes(d)
        ),
      })

      // Update plan status
      await state.set('plans', planId, {
        ...plan,
        status: PlanStatus.BLOCKED,
        updatedAt: new Date().toISOString(),
      })

      await emit({
        topic: 'plan.escalation.required',
        data: {
          planId,
          reason: 'Task blocked due to failed dependencies',
          blockedTaskId: blockedTask.id,
        },
      })
      return
    }

    logger.info('No executable tasks found, waiting', { planId })
    return
  }

  logger.info('Executing task', { 
    planId, 
    taskId: nextTask.id, 
    taskName: nextTask.name,
    toolType: nextTask.toolType,
  })

  // Check if task requires manual approval (skip for approval_gate tools - they handle approval internally)
  // approval_gate tools auto-approve in development mode
  if (nextTask.requiresApproval && nextTask.toolType !== 'approval_gate') {
    const approvalStatus = await checkApproval(planId, nextTask.id, state)
    if (!approvalStatus.approved) {
      logger.info('Task waiting for manual approval', { planId, taskId: nextTask.id })
      
      executionState.results[nextTask.id] = {
        taskId: nextTask.id,
        status: StepStatus.WAITING_APPROVAL,
        startedAt: new Date().toISOString(),
        retryAttempt: 0,
      }
      await state.set('plan-executions', planId, executionState)
      return
    }
  }

  // Execute the task (approval_gate tools handle their own approval logic)
  const toolContext = {
    previousOutputs: executionState.intermediateOutputs,
    traceId,
    logger,
  }

  const result = await toolExecutorService.executeTask(nextTask, toolContext)

  // Update execution state with result
  executionState.results[nextTask.id] = result

  if (result.status === StepStatus.COMPLETED) {
    executionState.completedTasks.push(nextTask.id)
    
    // Store outputs for downstream tasks
    if (result.output) {
      executionState.intermediateOutputs[nextTask.id] = result.output
    }

    await state.set('plan-executions', planId, executionState)

    // Update plan progress
    const updatedPlan = {
      ...plan,
      currentTaskIndex: plan.currentTaskIndex + 1,
      updatedAt: new Date().toISOString(),
    }
    await state.set('plans', planId, updatedPlan)

    logger.info('Task completed successfully', { 
      planId, 
      taskId: nextTask.id,
      durationMs: result.durationMs,
    })

    // Emit completion event to continue execution
    await emit({
      topic: 'plan.step.completed',
      data: {
        planId,
        previousTaskId: nextTask.id,
      },
    })

  } else if (result.status === StepStatus.FAILED) {
    executionState.failedTasks.push(nextTask.id)
    executionState.blockers.push({
      taskId: nextTask.id,
      reason: result.error || 'Unknown error',
      occurredAt: new Date().toISOString(),
    })

    await state.set('plan-executions', planId, executionState)

    logger.error('Task execution failed', { 
      planId, 
      taskId: nextTask.id,
      error: result.error,
      retryAttempt: result.retryAttempt,
    })

    await emit({
      topic: 'plan.step.failed',
      data: {
        planId,
        taskId: nextTask.id,
        error: result.error,
        retryAttempt: result.retryAttempt,
      },
    })
  }
}

/**
 * Find the next task that can be executed
 */
function findNextExecutableTask(
  plan: Plan,
  executionState: PlanExecutionState
): SubTask | null {
  const completedSet = new Set(executionState.completedTasks)
  const failedSet = new Set(executionState.failedTasks)

  for (const task of plan.tasks) {
    // Skip already completed or failed tasks
    if (completedSet.has(task.id) || failedSet.has(task.id)) {
      continue
    }

    // Skip tasks waiting for approval
    if (executionState.results[task.id]?.status === StepStatus.WAITING_APPROVAL) {
      continue
    }

    // Check if all dependencies are satisfied
    const { canExecute } = toolExecutorService.canExecuteTask(
      task,
      completedSet,
      failedSet
    )

    if (canExecute) {
      return task
    }
  }

  return null
}

/**
 * Find a task that is blocked due to failed dependencies
 */
function findBlockedTask(
  plan: Plan,
  executionState: PlanExecutionState
): SubTask | null {
  const completedSet = new Set(executionState.completedTasks)
  const failedSet = new Set(executionState.failedTasks)

  for (const task of plan.tasks) {
    if (completedSet.has(task.id) || failedSet.has(task.id)) {
      continue
    }

    // Check if any dependency has failed
    for (const depId of task.dependsOn) {
      if (failedSet.has(depId)) {
        return task
      }
    }
  }

  return null
}

/**
 * Check if a task has been approved
 */
async function checkApproval(
  planId: string,
  taskId: string,
  state: any
): Promise<{ approved: boolean; approvedBy?: string }> {
  const approval = await state.get<{ approved: boolean; approvedBy: string }>(
    'plan-approvals',
    `${planId}:${taskId}`
  )
  
  return approval || { approved: false }
}

