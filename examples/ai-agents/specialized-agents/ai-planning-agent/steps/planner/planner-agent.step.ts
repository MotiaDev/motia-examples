import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { llmService } from '../../src/services/planner/llm-service'
import { Plan, PlanStatus } from '../../src/services/planner/types'

/**
 * Planner Agent Event Step
 * 
 * Triggered by plan.requested event.
 * Uses Gemini 3 Pro to decompose the high-level objective into
 * an explicit sequence of actionable sub-tasks with dependencies.
 */

const inputSchema = z.object({
  planId: z.string(),
  objective: z.string(),
  context: z.record(z.string(), z.any()).optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'PlannerAgent',
  description: 'LLM-powered agent that decomposes objectives into executable sub-tasks',
  subscribes: ['plan.requested'],
  emits: [
    { topic: 'plan.generated', label: 'Plan successfully generated' },
    { topic: 'plan.generation.failed', label: 'Planning failed', conditional: true },
  ],
  input: inputSchema,
  flows: ['intelligent-planner'],
}

export const handler: Handlers['PlannerAgent'] = async (input, { emit, logger, state, traceId }) => {
  const { planId, objective, context } = input

  logger.info('Planner agent started', { planId, objective: objective.substring(0, 100) })

  // Update plan status to planning
  const plan = await state.get<Plan>('plans', planId)
  if (!plan) {
    logger.error('Plan not found for planning', { planId })
    await emit({
      topic: 'plan.generation.failed',
      data: { planId, error: 'Plan not found in state' },
    })
    return
  }

  await state.set('plans', planId, {
    ...plan,
    status: PlanStatus.PLANNING,
    updatedAt: new Date().toISOString(),
  })

  try {
    logger.info('Calling LLM to generate plan', { planId })

    // Call LLM to generate the plan
    const tasks = await llmService.generatePlan(objective, context)

    logger.info('Plan generated successfully', { 
      planId, 
      taskCount: tasks.length,
      tasks: tasks.map(t => ({ id: t.id, name: t.name, toolType: t.toolType })),
    })

    // Update plan with generated tasks
    const updatedPlan: Plan = {
      ...plan,
      status: PlanStatus.EXECUTING,
      tasks,
      currentTaskIndex: 0,
      updatedAt: new Date().toISOString(),
    }

    await state.set('plans', planId, updatedPlan)

    // Emit plan.generated to trigger the executor
    await emit({
      topic: 'plan.generated',
      data: {
        planId,
        taskCount: tasks.length,
        firstTaskId: tasks[0]?.id,
      },
    })

    logger.info('Plan generation complete, executor triggered', { planId })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    logger.error('Failed to generate plan', { 
      planId, 
      error: errorMessage,
    })

    // Update plan status to failed
    await state.set('plans', planId, {
      ...plan,
      status: PlanStatus.FAILED,
      updatedAt: new Date().toISOString(),
    })

    await emit({
      topic: 'plan.generation.failed',
      data: {
        planId,
        error: errorMessage,
      },
    })
  }
}

