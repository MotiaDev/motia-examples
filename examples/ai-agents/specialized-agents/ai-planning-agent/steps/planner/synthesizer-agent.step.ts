import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { llmService } from '../../src/services/planner/llm-service'
import { sendEmail, generatePlanEmailHtml } from '../../src/services/planner/email-service'
import { 
  Plan, 
  PlanStatus, 
  PlanExecutionState, 
  SynthesisReport,
} from '../../src/services/planner/types'

/**
 * Synthesizer Agent Event Step
 * 
 * Triggered when all plan steps complete.
 * Assembles final results and generates a comprehensive report
 * using Gemini 3 Pro for natural language summarization.
 */

const inputSchema = z.object({
  planId: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'SynthesizerAgent',
  description: 'Assembles final results and generates synthesis reports',
  subscribes: ['plan.all.steps.completed'],
  emits: [
    { topic: 'plan.completed', label: 'Plan completed with report' },
    { topic: 'plan.synthesis.failed', label: 'Synthesis failed', conditional: true },
  ],
  input: inputSchema,
  flows: ['intelligent-planner'],
}

export const handler: Handlers['SynthesizerAgent'] = async (input, { emit, logger, state, traceId }) => {
  const { planId } = input

  logger.info('Synthesizer agent started', { planId })

  const plan = await state.get<Plan>('plans', planId)
  const executionState = await state.get<PlanExecutionState>('plan-executions', planId)

  if (!plan || !executionState) {
    logger.error('Plan or execution state not found for synthesis', { planId })
    await emit({
      topic: 'plan.synthesis.failed',
      data: { planId, error: 'Plan data not found' },
    })
    return
  }

  try {
    logger.info('Generating synthesis report', { planId })

    // Calculate metrics
    const totalDurationMs = calculateTotalDuration(executionState)
    const tasksCompleted = executionState.completedTasks.length
    const tasksFailed = executionState.failedTasks.length

    // Generate LLM-powered synthesis
    const llmSynthesis = await llmService.generateSynthesisReport(plan, executionState)

    // Build complete report
    const report: SynthesisReport = {
      planId,
      objective: plan.objective,
      summary: llmSynthesis.summary,
      tasksCompleted,
      tasksFailed,
      totalDurationMs,
      accomplishments: llmSynthesis.accomplishments || generateAccomplishments(plan, executionState),
      issues: llmSynthesis.issues || generateIssues(plan, executionState),
      recommendations: llmSynthesis.recommendations || [],
      metrics: {
        ...llmSynthesis.metrics,
        averageTaskDurationMs: totalDurationMs / Math.max(tasksCompleted, 1),
        successRate: tasksCompleted / Math.max(plan.tasks.length, 1) * 100,
        planGenerationTime: plan.createdAt,
        completionTime: new Date().toISOString(),
      },
      generatedAt: new Date().toISOString(),
    }

    // Store report
    await state.set('plan-reports', planId, report)

    // Update plan status to completed
    const completedPlan: Plan = {
      ...plan,
      status: PlanStatus.COMPLETED,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await state.set('plans', planId, completedPlan)

    logger.info('Synthesis complete', {
      planId,
      tasksCompleted,
      tasksFailed,
      totalDurationMs,
      successRate: report.metrics.successRate,
    })

    // Send completion email via Resend
    // Always use ALERT_RECIPIENTS for actual delivery (Resend test API only allows verified emails)
    // Stakeholders are mentioned in the email body for reference
    const stakeholders = plan.metadata?.stakeholders || []
    const emailRecipients = process.env.ALERT_RECIPIENTS?.split(',').map(e => e.trim()) || []

    if (emailRecipients.length > 0) {
      const emailDetails = `
Summary: ${report.summary}

Tasks Completed: ${tasksCompleted}/${plan.tasks.length}
${tasksFailed > 0 ? `Tasks Failed: ${tasksFailed}` : ''}
Total Duration: ${(totalDurationMs / 1000).toFixed(1)} seconds
Success Rate: ${report.metrics.successRate.toFixed(1)}%
${stakeholders.length > 0 ? `\nStakeholders: ${stakeholders.join(', ')}` : ''}

Accomplishments:
${report.accomplishments.map(a => `• ${a}`).join('\n')}
${report.issues.length > 0 ? `
Issues:
${report.issues.map(i => `• ${i.taskName}: ${i.error}`).join('\n')}` : ''}
${report.recommendations.length > 0 ? `
Recommendations:
${report.recommendations.map(r => `• ${r}`).join('\n')}` : ''}
      `.trim()

      const htmlContent = generatePlanEmailHtml({
        title: `Plan Completed: ${plan.objective.substring(0, 50)}${plan.objective.length > 50 ? '...' : ''}`,
        planId,
        objective: plan.objective,
        status: 'completed',
        details: emailDetails,
      })

      const emailResult = await sendEmail({
        to: emailRecipients,
        subject: `✅ Plan Completed: ${plan.objective.substring(0, 50)}`,
        html: htmlContent,
        text: emailDetails,
        tags: [
          { name: 'plan_id', value: planId },
          { name: 'event_type', value: 'completion' },
        ],
      })

      logger.info('Completion email sent', {
        planId,
        success: emailResult.success,
        messageId: emailResult.messageId,
        recipients: emailResult.recipients,
        error: emailResult.error,
      })
    }

    // Trigger callback if configured
    const callback = await state.get<{ url: string }>('plan-callbacks', planId)
    if (callback?.url) {
      try {
        await fetch(callback.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, status: 'completed', report }),
        })
        logger.info('Callback sent successfully', { planId, callbackUrl: callback.url })
      } catch (callbackError) {
        logger.warn('Failed to send callback', { 
          planId, 
          error: callbackError instanceof Error ? callbackError.message : String(callbackError),
        })
      }
    }

    await emit({
      topic: 'plan.completed',
      data: {
        planId,
        summary: report.summary,
        tasksCompleted,
        tasksFailed,
        totalDurationMs,
      },
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    logger.error('Synthesis failed', { planId, error: errorMessage })

    // Still mark plan as completed even if synthesis fails
    await state.set('plans', planId, {
      ...plan,
      status: PlanStatus.COMPLETED,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    await emit({
      topic: 'plan.synthesis.failed',
      data: {
        planId,
        error: errorMessage,
      },
    })
  }
}

/**
 * Calculate total execution duration
 */
function calculateTotalDuration(executionState: PlanExecutionState): number {
  return Object.values(executionState.results).reduce((total, result) => {
    return total + (result.durationMs || 0)
  }, 0)
}

/**
 * Generate accomplishments from execution state
 */
function generateAccomplishments(
  plan: Plan,
  executionState: PlanExecutionState
): string[] {
  return executionState.completedTasks.map(taskId => {
    const task = plan.tasks.find(t => t.id === taskId)
    return task ? `Completed: ${task.name}` : `Completed task ${taskId}`
  })
}

/**
 * Generate issues from execution state
 */
function generateIssues(
  plan: Plan,
  executionState: PlanExecutionState
): Array<{ taskId: string; taskName: string; error: string; resolution?: string }> {
  return executionState.failedTasks.map(taskId => {
    const task = plan.tasks.find(t => t.id === taskId)
    const result = executionState.results[taskId]
    
    return {
      taskId,
      taskName: task?.name || 'Unknown task',
      error: result?.error || 'Unknown error',
      resolution: undefined,
    }
  })
}

