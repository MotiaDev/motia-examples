/**
 * List Apps API Step
 * 
 * Endpoint to list all app generation workflows.
 * Returns a summary of all workflows with their status.
 * 
 * GET /apps
 */

import type { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { coreMiddleware } from '../../middlewares/core.middleware';

const workflowSummarySchema = z.object({
  flowId: z.string(),
  appSpec: z.object({
    title: z.string(),
    genre: z.string(),
    description: z.string().optional(),
    features: z.array(z.string()).optional(),
  }).optional(),
  status: z.string(),
  currentPhase: z.string().optional(),
  progress: z.number(),
  metrics: z.object({
    totalTokens: z.number(),
    estimatedCost: z.number(),
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const responseSchema = z.object({
  workflows: z.array(workflowSummarySchema),
  total: z.number(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ListAppsAPI',
  description: 'List all app generation workflows',
  path: '/apps',
  method: 'GET',
  middleware: [coreMiddleware],
  emits: [],
  flows: ['app-generator'],
  responseSchema: {
    200: responseSchema,
  },
};

export const handler: Handlers['ListAppsAPI'] = async (_, { logger, state }) => {
  logger.info('Listing all workflows');

  // Get all workflows from state
  const workflows = await state.getGroup<any>('workflows');
  
  // Map to summary format with full data for plugin
  const summaries = (workflows || [])
    .filter(w => w && w.flowId)
    .map((w: any) => ({
      flowId: w.flowId,
      appSpec: w.appSpec ? {
        title: w.appSpec.title || 'Unknown',
        genre: w.appSpec.genre || 'unknown',
        description: w.appSpec.description,
        features: w.appSpec.features || [],
      } : undefined,
      status: w.status,
      currentPhase: w.currentPhase,
      progress: calculateProgress(w.status),
      metrics: w.metrics ? {
        totalTokens: w.metrics.totalTokens || 0,
        estimatedCost: w.metrics.estimatedCost || 0,
      } : undefined,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }))
    .sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return {
    status: 200,
    body: {
      workflows: summaries,
      total: summaries.length,
    },
  };
};

function calculateProgress(status: string): number {
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
  return statusProgress[status] || 0;
}

