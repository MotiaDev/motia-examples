/**
 * Get App Generation Status API Step
 * 
 * Endpoint to check the status of an app generation workflow.
 * Returns detailed progress information, metrics, and any errors.
 * 
 * GET /apps/:flowId/status
 */

import type { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { coreMiddleware } from '../../middlewares/core.middleware';

const responseSchema = z.object({
  flowId: z.string(),
  status: z.enum(['requested', 'designing', 'design_completed', 'coding', 'testing', 'refining', 'assembling', 'completed', 'failed', 'cancelled']),
  currentPhase: z.string(),
  progress: z.number(),
  appTitle: z.string(),
  metrics: z.object({
    totalTokens: z.number(),
    estimatedCost: z.number(),
    totalDuration: z.number(),
  }),
  modules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    filesCount: z.number(),
  })),
  errors: z.array(z.object({
    phase: z.string(),
    message: z.string(),
    timestamp: z.string(),
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetAppStatusAPI',
  description: 'Get the status and progress of an app generation workflow',
  path: '/apps/:flowId/status',
  method: 'GET',
  middleware: [coreMiddleware],
  emits: [],
  virtualSubscribes: ['app_generation.requested'],
  flows: ['app-generator'],
  responseSchema: {
    200: responseSchema,
    404: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['GetAppStatusAPI'] = async (req, { logger, state }) => {
  const { flowId } = req.pathParams;
  
  logger.info('Getting workflow status', { flowId });

  // Retrieve workflow state
  const workflowState = await state.get<any>('workflows', flowId);
  
  if (!workflowState) {
    return {
      status: 404,
      body: {
        error: `Workflow not found: ${flowId}`,
      },
    };
  }

  // Calculate progress percentage
  const progress = calculateProgress(workflowState);

  // Format modules summary
  const modules = (workflowState.modules || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    status: m.status,
    filesCount: m.files?.length || 0,
  }));

  return {
    status: 200,
    body: {
      flowId: workflowState.flowId,
      status: workflowState.status,
      currentPhase: workflowState.currentPhase,
      progress,
      appTitle: workflowState.appSpec?.title || 'Unknown',
      metrics: {
        totalTokens: workflowState.metrics?.totalTokens || 0,
        estimatedCost: workflowState.metrics?.estimatedCost || 0,
        totalDuration: workflowState.metrics?.totalDuration || 0,
      },
      modules,
      errors: workflowState.errors || [],
      createdAt: workflowState.createdAt,
      updatedAt: workflowState.updatedAt,
    },
  };
};

function calculateProgress(workflowState: any): number {
  const statusProgress: Record<string, number> = {
    'requested': 5,
    'designing': 15,
    'design_completed': 20,
    'coding': 45,
    'testing': 60,
    'refining': 75,
    'assembling': 90,
    'completed': 100,
    'failed': 0,
    'cancelled': 0,
  };

  const baseProgress = statusProgress[workflowState.status] || 0;
  
  // Add module-based progress for coding phase
  if (workflowState.status === 'coding') {
    const totalModules = workflowState.designDocument?.components?.length || 1;
    const completedModules = workflowState.modules?.length || 0;
    const moduleProgress = (completedModules / totalModules) * 25;
    return Math.min(45, 20 + moduleProgress);
  }

  return baseProgress;
}

