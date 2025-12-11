import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { Plan, PlanExecutionState } from '../../src/services/planner/types'

/**
 * Escalation Handler Event Step
 * 
 * Handles escalation requests when plan execution requires
 * human intervention. Notifies stakeholders and waits for resolution.
 */

const inputSchema = z.object({
  planId: z.string(),
  taskId: z.string().optional(),
  reason: z.string(),
  error: z.string().optional(),
  blockedTaskId: z.string().optional(),
  stakeholders: z.array(z.string()).optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'EscalationHandler',
  description: 'Handles plan escalations requiring human intervention',
  subscribes: ['plan.escalation.required'],
  emits: [
    { topic: 'notification.sent', label: 'Stakeholders notified' },
  ],
  input: inputSchema,
  flows: ['intelligent-planner'],
}

export const handler: Handlers['EscalationHandler'] = async (input, { emit, logger, state }) => {
  const { planId, taskId, reason, error, blockedTaskId, stakeholders } = input

  logger.warn('Processing escalation', { 
    planId, 
    taskId: taskId || blockedTaskId, 
    reason,
  })

  const plan = await state.get<Plan>('plans', planId)
  const executionState = await state.get<PlanExecutionState>('plan-executions', planId)

  if (!plan) {
    logger.error('Plan not found for escalation', { planId })
    return
  }

  // Build escalation details
  const escalationDetails = {
    planId,
    objective: plan.objective,
    currentStatus: plan.status,
    blockedTask: (taskId || blockedTaskId) 
      ? plan.tasks.find(t => t.id === (taskId || blockedTaskId))
      : null,
    reason,
    error,
    progress: {
      completed: executionState?.completedTasks.length || 0,
      failed: executionState?.failedTasks.length || 0,
      total: plan.tasks.length,
    },
    escalatedAt: new Date().toISOString(),
  }

  // Store escalation record
  await state.set('plan-escalations', planId, escalationDetails)

  // Log detailed escalation information
  logger.info('Escalation recorded', {
    planId,
    blockedTask: escalationDetails.blockedTask?.name,
    progress: escalationDetails.progress,
    stakeholders: stakeholders || plan.metadata?.stakeholders,
  })

  // In production, this would integrate with notification systems
  // For now, we emit a notification event
  await emit({
    topic: 'notification.sent',
    data: {
      type: 'escalation',
      planId,
      recipients: stakeholders || plan.metadata?.stakeholders || [],
      subject: `Plan Escalation: ${plan.objective.substring(0, 50)}...`,
      body: `
Plan execution requires attention.

Objective: ${plan.objective}
Status: ${plan.status}
Reason: ${reason}
${error ? `Error: ${error}` : ''}

Progress: ${escalationDetails.progress.completed}/${escalationDetails.progress.total} tasks completed
${escalationDetails.progress.failed > 0 ? `Failed: ${escalationDetails.progress.failed} tasks` : ''}

${escalationDetails.blockedTask ? `Blocked Task: ${escalationDetails.blockedTask.name}` : ''}

Please review and take appropriate action.
      `.trim(),
    },
  })

  logger.info('Escalation notifications sent', { 
    planId, 
    recipientCount: (stakeholders || plan.metadata?.stakeholders || []).length,
  })
}

