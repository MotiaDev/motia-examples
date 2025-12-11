import { SubTask, TaskResult, StepStatus, ToolType } from './types'
import { sendEmail, generatePlanEmailHtml } from './email-service'

/**
 * Tool Executor Service
 * 
 * Routes sub-tasks to appropriate tool handlers and executes them.
 * Each tool type has a dedicated executor that handles the specific logic.
 */

export interface ToolContext {
  previousOutputs: Record<string, any>
  traceId: string
  logger: {
    info: (msg: string, meta?: any) => void
    warn: (msg: string, meta?: any) => void
    error: (msg: string, meta?: any) => void
  }
}

export interface ToolExecutor {
  execute(task: SubTask, context: ToolContext): Promise<Record<string, any>>
}

/**
 * Web Search Tool - Simulates web search
 */
const webSearchExecutor: ToolExecutor = {
  async execute(task, context) {
    context.logger.info('Executing web search', { query: task.inputs.query })
    
    // In production, integrate with a real search API
    await delay(100)
    
    return {
      results: [
        { title: 'Search Result 1', url: 'https://example.com/1', snippet: 'Relevant information...' },
        { title: 'Search Result 2', url: 'https://example.com/2', snippet: 'More details...' },
      ],
      totalResults: 2,
      searchedAt: new Date().toISOString(),
    }
  }
}

/**
 * Slack Notification Tool
 */
const slackNotificationExecutor: ToolExecutor = {
  async execute(task, context) {
    const { channel, message, mentions } = task.inputs
    context.logger.info('Sending Slack notification', { channel, message })
    
    // In production, use Slack API
    await delay(50)
    
    return {
      sent: true,
      channel,
      timestamp: new Date().toISOString(),
      messageId: `msg_${Date.now()}`,
    }
  }
}

/**
 * Database Query Tool
 */
const databaseQueryExecutor: ToolExecutor = {
  async execute(task, context) {
    const { query, database } = task.inputs
    context.logger.info('Executing database query', { database })
    
    // In production, execute actual query
    await delay(50)
    
    return {
      rowCount: 10,
      data: [{ id: 1, status: 'active' }],
      executedAt: new Date().toISOString(),
    }
  }
}

/**
 * Jira Ticket Tool
 */
const jiraTicketExecutor: ToolExecutor = {
  async execute(task, context) {
    const { project, summary, description, issueType, priority } = task.inputs
    context.logger.info('Creating Jira ticket', { project, summary })
    
    // In production, use Jira API
    await delay(50)
    
    return {
      ticketId: `${project || 'PROJ'}-${Math.floor(Math.random() * 10000)}`,
      url: `https://jira.example.com/browse/${project || 'PROJ'}-${Math.floor(Math.random() * 10000)}`,
      createdAt: new Date().toISOString(),
    }
  }
}

/**
 * Approval Gate Tool
 * Auto-approves in development mode for faster execution
 */
const approvalGateExecutor: ToolExecutor = {
  async execute(task, context) {
    const { approvers, message, timeout } = task.inputs
    context.logger.info('Approval gate triggered', { approvers, message, taskName: task.name })
    
    // In production, this would integrate with approval workflow (Slack, email, etc.)
    // For development, auto-approve immediately
    await delay(100) // Minimal delay for logging visibility
    
    context.logger.info('Approval gate auto-approved', { taskName: task.name })
    
    return {
      approved: true,
      approvedBy: 'system-auto-approve',
      approvedAt: new Date().toISOString(),
      notes: 'Auto-approved in development mode',
      taskName: task.name,
    }
  }
}

/**
 * GitHub Check Tool
 */
const githubCheckExecutor: ToolExecutor = {
  async execute(task, context) {
    const { repository, branch, checkType } = task.inputs
    context.logger.info('Checking GitHub', { repository, branch, checkType })
    
    // In production, use GitHub API
    await delay(50)
    
    return {
      repository,
      branch: branch || 'main',
      status: 'success',
      checks: {
        tests: 'passed',
        linting: 'passed',
        build: 'passed',
      },
      lastCommit: `${Math.random().toString(36).substring(2, 9)}`,
      checkedAt: new Date().toISOString(),
    }
  }
}

/**
 * CI/CD Webhook Tool
 */
const cicdWebhookExecutor: ToolExecutor = {
  async execute(task, context) {
    const { webhookUrl, payload, environment } = task.inputs
    context.logger.info('Triggering CI/CD webhook', { environment })
    
    // In production, make actual HTTP call
    await delay(100)
    
    return {
      triggered: true,
      pipelineId: `pipeline_${Date.now()}`,
      environment: environment || 'staging',
      status: 'running',
      estimatedDuration: '5 minutes',
      triggeredAt: new Date().toISOString(),
    }
  }
}

/**
 * Email Send Tool - Uses Resend API
 */
const emailSendExecutor: ToolExecutor = {
  async execute(task, context) {
    const { to, subject, body, html, cc, planId, taskName } = task.inputs
    
    // Always use ALERT_RECIPIENTS for actual delivery (Resend test API only allows verified emails)
    // The original 'to' is logged for reference
    const alertRecipients = process.env.ALERT_RECIPIENTS?.split(',').map(e => e.trim()) || []
    const originalRecipients = to ? (Array.isArray(to) ? to : [to]) : []
    
    context.logger.info('Sending email via Resend', { 
      to: alertRecipients,
      originalTo: originalRecipients,
      subject,
      taskName,
    })
    
    // Generate HTML if not provided
    const emailHtml = html || generatePlanEmailHtml({
      title: subject || `Task Update: ${taskName || 'Plan Execution'}`,
      planId: planId || context.traceId,
      objective: task.description || 'Plan task execution',
      status: 'executing',
      details: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
    })

    // Send real email via Resend to verified recipients only
    const result = await sendEmail({
      to: alertRecipients,
      subject: subject || `[Motia Plan] ${taskName || 'Task Update'}`,
      html: emailHtml,
      text: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
    })

    context.logger.info('Email sent via Resend', {
      success: result.success,
      messageId: result.messageId,
      recipients: result.recipients,
      error: result.error,
    })
    
    return {
      sent: result.success,
      messageId: result.messageId,
      recipients: result.recipients,
      originalRecipients,
      sentAt: result.sentAt,
      error: result.error,
      provider: 'resend',
    }
  }
}

/**
 * HTTP Request Tool
 */
const httpRequestExecutor: ToolExecutor = {
  async execute(task, context) {
    const { url, method, headers, body } = task.inputs
    context.logger.info('Making HTTP request', { url, method })
    
    // In production, make actual HTTP request
    await delay(50)
    
    return {
      statusCode: 200,
      body: { success: true, data: {} },
      headers: { 'content-type': 'application/json' },
      duration: 50,
      requestedAt: new Date().toISOString(),
    }
  }
}

/**
 * Data Transform Tool
 */
const dataTransformExecutor: ToolExecutor = {
  async execute(task, context) {
    const { sourceKey, transformation, outputKey } = task.inputs
    const sourceData = context.previousOutputs[sourceKey]
    
    context.logger.info('Transforming data', { sourceKey, transformation })
    
    // Apply transformation logic
    let result = sourceData
    
    if (transformation === 'extract') {
      result = { extracted: sourceData }
    } else if (transformation === 'aggregate') {
      result = { aggregated: sourceData, count: Array.isArray(sourceData) ? sourceData.length : 1 }
    }
    
    return {
      [outputKey || 'transformedData']: result,
      transformedAt: new Date().toISOString(),
    }
  }
}

/**
 * Delay Tool
 */
const delayExecutor: ToolExecutor = {
  async execute(task, context) {
    const { durationMs, reason } = task.inputs
    context.logger.info('Executing delay', { durationMs, reason })
    
    await delay(durationMs || 1000)
    
    return {
      waited: true,
      durationMs: durationMs || 1000,
      completedAt: new Date().toISOString(),
    }
  }
}

// Helper function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Tool registry
 */
const toolRegistry: Record<ToolType, ToolExecutor> = {
  [ToolType.WEB_SEARCH]: webSearchExecutor,
  [ToolType.SLACK_NOTIFICATION]: slackNotificationExecutor,
  [ToolType.DATABASE_QUERY]: databaseQueryExecutor,
  [ToolType.JIRA_TICKET]: jiraTicketExecutor,
  [ToolType.APPROVAL_GATE]: approvalGateExecutor,
  [ToolType.GITHUB_CHECK]: githubCheckExecutor,
  [ToolType.CICD_WEBHOOK]: cicdWebhookExecutor,
  [ToolType.EMAIL_SEND]: emailSendExecutor,
  [ToolType.HTTP_REQUEST]: httpRequestExecutor,
  [ToolType.DATA_TRANSFORM]: dataTransformExecutor,
  [ToolType.DELAY]: delayExecutor,
}

/**
 * Main Tool Executor Service
 */
export class ToolExecutorService {
  /**
   * Execute a task and return the result
   */
  async executeTask(
    task: SubTask,
    context: ToolContext,
    retryAttempt: number = 0
  ): Promise<TaskResult> {
    const startTime = Date.now()
    const startedAt = new Date().toISOString()

    try {
      // Inject previous outputs into task inputs
      const enrichedInputs = this.enrichInputs(task.inputs, context.previousOutputs)
      const enrichedTask = { ...task, inputs: enrichedInputs }

      // Get the appropriate executor
      const executor = toolRegistry[task.toolType]
      if (!executor) {
        throw new Error(`Unknown tool type: ${task.toolType}`)
      }

      // Execute with timeout
      const output = await this.executeWithTimeout(
        executor.execute(enrichedTask, context),
        task.timeoutMs
      )

      const completedAt = new Date().toISOString()
      const durationMs = Date.now() - startTime

      return {
        taskId: task.id,
        status: StepStatus.COMPLETED,
        startedAt,
        completedAt,
        output,
        retryAttempt,
        durationMs,
      }
    } catch (error) {
      const completedAt = new Date().toISOString()
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Check if we should retry
      if (retryAttempt < task.retryCount) {
        context.logger.warn('Task failed, will retry', {
          taskId: task.id,
          attempt: retryAttempt + 1,
          maxRetries: task.retryCount,
          error: errorMessage,
        })

        // Exponential backoff
        await delay(Math.pow(2, retryAttempt) * 1000)
        return this.executeTask(task, context, retryAttempt + 1)
      }

      return {
        taskId: task.id,
        status: StepStatus.FAILED,
        startedAt,
        completedAt,
        error: errorMessage,
        retryAttempt,
        durationMs,
      }
    }
  }

  /**
   * Enrich task inputs with outputs from previous steps
   */
  private enrichInputs(
    inputs: Record<string, any>,
    previousOutputs: Record<string, any>
  ): Record<string, any> {
    const enriched: Record<string, any> = {}

    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        // Template variable reference like ${task_1.result}
        const path = value.slice(2, -1)
        const [taskId, ...keyPath] = path.split('.')
        
        let resolved = previousOutputs[taskId]
        for (const k of keyPath) {
          resolved = resolved?.[k]
        }
        enriched[key] = resolved ?? value
      } else {
        enriched[key] = value
      }
    }

    return enriched
  }

  /**
   * Execute with timeout
   */
  private executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task execution timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      promise
        .then(result => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timer)
          reject(error)
        })
    })
  }

  /**
   * Check if all dependencies are satisfied
   */
  canExecuteTask(
    task: SubTask,
    completedTasks: Set<string>,
    failedTasks: Set<string>
  ): { canExecute: boolean; reason?: string } {
    // Check if any dependency failed
    for (const depId of task.dependsOn) {
      if (failedTasks.has(depId)) {
        return {
          canExecute: false,
          reason: `Dependency ${depId} has failed`,
        }
      }
    }

    // Check if all dependencies are complete
    for (const depId of task.dependsOn) {
      if (!completedTasks.has(depId)) {
        return {
          canExecute: false,
          reason: `Waiting for dependency ${depId}`,
        }
      }
    }

    return { canExecute: true }
  }
}

export const toolExecutorService = new ToolExecutorService()

