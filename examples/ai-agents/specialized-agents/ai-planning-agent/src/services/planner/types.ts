import { z } from 'zod'

/**
 * Plan Status Enum
 */
export const PlanStatus = {
  PENDING: 'pending',
  PLANNING: 'planning',
  EXECUTING: 'executing',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const

export type PlanStatus = (typeof PlanStatus)[keyof typeof PlanStatus]

/**
 * Step Status Enum
 */
export const StepStatus = {
  QUEUED: 'queued',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  WAITING_APPROVAL: 'waiting_approval',
} as const

export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus]

/**
 * Tool Types available for execution
 */
export const ToolType = {
  WEB_SEARCH: 'web_search',
  SLACK_NOTIFICATION: 'slack_notification',
  DATABASE_QUERY: 'database_query',
  JIRA_TICKET: 'jira_ticket',
  APPROVAL_GATE: 'approval_gate',
  GITHUB_CHECK: 'github_check',
  CICD_WEBHOOK: 'cicd_webhook',
  EMAIL_SEND: 'email_send',
  HTTP_REQUEST: 'http_request',
  DATA_TRANSFORM: 'data_transform',
  DELAY: 'delay',
} as const

export type ToolType = (typeof ToolType)[keyof typeof ToolType]

/**
 * Schema for a single sub-task in the plan
 */
export const subTaskSchema = z.object({
  id: z.string().describe('Unique identifier for the sub-task'),
  name: z.string().describe('Human-readable name for the task'),
  description: z.string().describe('Detailed description of what this task does'),
  toolType: z.nativeEnum(ToolType).describe('The tool to use for this task'),
  inputs: z.record(z.string(), z.any()).describe('Input parameters for the tool'),
  outputs: z.array(z.string()).describe('Names of outputs this step produces'),
  dependsOn: z.array(z.string()).default([]).describe('IDs of tasks this depends on'),
  requiresApproval: z.boolean().default(false).describe('Whether this step needs human approval'),
  retryCount: z.number().default(3).describe('Number of retries on failure'),
  timeoutMs: z.number().default(30000).describe('Timeout in milliseconds'),
})

export type SubTask = z.infer<typeof subTaskSchema>

/**
 * Schema for a generated plan
 */
export const planSchema = z.object({
  id: z.string(),
  objective: z.string(),
  context: z.record(z.string(), z.any()).optional(),
  status: z.nativeEnum(PlanStatus),
  tasks: z.array(subTaskSchema),
  currentTaskIndex: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
  metadata: z.object({
    stakeholders: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    deadlines: z.record(z.string(), z.string()).optional(),
    resources: z.array(z.string()).optional(),
    tenantId: z.string().optional(),
  }).optional(),
})

export type Plan = z.infer<typeof planSchema>

/**
 * Schema for task execution result
 */
export const taskResultSchema = z.object({
  taskId: z.string(),
  status: z.nativeEnum(StepStatus),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  output: z.record(z.string(), z.any()).optional(),
  error: z.string().optional(),
  retryAttempt: z.number().default(0),
  durationMs: z.number().optional(),
})

export type TaskResult = z.infer<typeof taskResultSchema>

/**
 * Schema for plan execution state
 */
export const planExecutionStateSchema = z.object({
  planId: z.string(),
  results: z.record(z.string(), taskResultSchema),
  intermediateOutputs: z.record(z.string(), z.any()),
  failedTasks: z.array(z.string()),
  completedTasks: z.array(z.string()),
  blockers: z.array(z.object({
    taskId: z.string(),
    reason: z.string(),
    occurredAt: z.string(),
  })),
})

export type PlanExecutionState = z.infer<typeof planExecutionStateSchema>

/**
 * Schema for final synthesis report
 */
export const synthesisReportSchema = z.object({
  planId: z.string(),
  objective: z.string(),
  summary: z.string(),
  tasksCompleted: z.number(),
  tasksFailed: z.number(),
  totalDurationMs: z.number(),
  accomplishments: z.array(z.string()),
  issues: z.array(z.object({
    taskId: z.string(),
    taskName: z.string(),
    error: z.string(),
    resolution: z.string().optional(),
  })),
  recommendations: z.array(z.string()),
  metrics: z.record(z.string(), z.any()),
  generatedAt: z.string(),
})

export type SynthesisReport = z.infer<typeof synthesisReportSchema>

/**
 * Request body for plan execution
 */
export const executePlanRequestSchema = z.object({
  objective: z.string().min(10, 'Objective must be at least 10 characters'),
  context: z.object({
    stakeholders: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    deadlines: z.record(z.string(), z.string()).optional(),
    resources: z.array(z.string()).optional(),
    domain: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  }).optional(),
  tenantId: z.string().optional(),
  callbackUrl: z.string().url().optional(),
})

export type ExecutePlanRequest = z.infer<typeof executePlanRequestSchema>

/**
 * Response schemas
 */
export const planCreatedResponseSchema = z.object({
  planId: z.string(),
  status: z.nativeEnum(PlanStatus),
  message: z.string(),
  estimatedCompletionTime: z.string().optional(),
})

export type PlanCreatedResponse = z.infer<typeof planCreatedResponseSchema>

export const planStatusResponseSchema = z.object({
  plan: planSchema,
  executionState: planExecutionStateSchema.optional(),
  report: synthesisReportSchema.optional(),
  timeline: z.array(z.object({
    taskId: z.string(),
    taskName: z.string(),
    status: z.nativeEnum(StepStatus),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
  })),
})

export type PlanStatusResponse = z.infer<typeof planStatusResponseSchema>

export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
})

export type ErrorResponse = z.infer<typeof errorResponseSchema>

