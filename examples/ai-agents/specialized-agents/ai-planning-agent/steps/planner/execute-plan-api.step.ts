import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware'
import {
  executePlanRequestSchema,
  planCreatedResponseSchema,
  errorResponseSchema,
  PlanStatus,
  Plan,
  PlanExecutionState,
} from '../../src/services/planner/types'

/**
 * POST /plans/execute
 * 
 * Main entry point for the Planning Architecture.
 * Accepts a high-level objective and context, creates a plan,
 * and triggers the planning workflow.
 */

const bodySchema = executePlanRequestSchema

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ExecutePlanApi',
  description: 'Submit a high-level objective for intelligent planning and execution',
  path: '/plans/execute',
  method: 'POST',
  flows: ['intelligent-planner'],
  middleware: [errorHandlerMiddleware],
  bodySchema,
  responseSchema: {
    202: planCreatedResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema,
  },
  emits: ['plan.requested'],
}

export const handler: Handlers['ExecutePlanApi'] = async (req, { emit, logger, state, traceId }) => {
  const validatedBody = bodySchema.parse(req.body)
  
  logger.info('Received plan execution request', {
    objective: validatedBody.objective.substring(0, 100),
    priority: validatedBody.context?.priority,
    tenantId: validatedBody.tenantId,
  })

  // Generate unique plan ID
  const planId = uuidv4()
  const now = new Date().toISOString()

  // Create initial plan structure
  const plan: Plan = {
    id: planId,
    objective: validatedBody.objective,
    context: validatedBody.context,
    status: PlanStatus.PENDING,
    tasks: [],
    currentTaskIndex: 0,
    createdAt: now,
    updatedAt: now,
    metadata: {
      stakeholders: validatedBody.context?.stakeholders,
      constraints: validatedBody.context?.constraints,
      deadlines: validatedBody.context?.deadlines,
      resources: validatedBody.context?.resources,
      tenantId: validatedBody.tenantId,
    },
  }

  // Initialize execution state
  const executionState: PlanExecutionState = {
    planId,
    results: {},
    intermediateOutputs: {},
    failedTasks: [],
    completedTasks: [],
    blockers: [],
  }

  // Store plan and execution state
  await state.set('plans', planId, plan)
  await state.set('plan-executions', planId, executionState)

  // Store callback URL if provided
  if (validatedBody.callbackUrl) {
    await state.set('plan-callbacks', planId, { url: validatedBody.callbackUrl })
  }

  logger.info('Plan created, triggering planner', { planId })

  // Emit event to trigger the Planner
  await emit({
    topic: 'plan.requested',
    data: {
      planId,
      objective: validatedBody.objective,
      context: validatedBody.context,
    },
  })

  // Return accepted response
  return {
    status: 202,
    body: {
      planId,
      status: PlanStatus.PENDING,
      message: 'Plan request accepted. Use GET /plans/{id} to track progress.',
      estimatedCompletionTime: calculateEstimatedTime(validatedBody.context?.priority),
    },
  }
}

/**
 * Estimate completion time based on priority
 */
function calculateEstimatedTime(priority?: string): string {
  const now = new Date()
  const minutes = priority === 'critical' ? 5 : priority === 'high' ? 10 : priority === 'medium' ? 20 : 30
  now.setMinutes(now.getMinutes() + minutes)
  return now.toISOString()
}

