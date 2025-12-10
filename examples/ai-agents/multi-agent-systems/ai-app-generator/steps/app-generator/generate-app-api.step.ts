/**
 * Generate App API Step
 * 
 * Entry point for the AI App Generator workflow.
 * Receives natural language specs and triggers the multi-agent pipeline.
 * 
 * POST /apps/generate
 */

import type { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { coreMiddleware } from '../../middlewares/core.middleware';
import { AppSpecSchema } from '../../src/types/app-generator.types';
import { createProgressEvent } from '../../src/services/progress.service';

const bodySchema = AppSpecSchema;

const responseSchema = z.object({
  success: z.boolean(),
  flowId: z.string(),
  message: z.string(),
  estimatedTime: z.string(),
  statusEndpoint: z.string(),
  streamEndpoint: z.string(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GenerateAppAPI',
  description: 'Entry point for AI-powered full-stack application generation. Submit a natural language app spec to trigger the multi-agent workflow.',
  path: '/apps/generate',
  method: 'POST',
  middleware: [coreMiddleware],
  emits: [
    { topic: 'app_generation.requested', label: 'Triggers Architect Agent' }
  ],
  flows: ['app-generator'],
  bodySchema,
  responseSchema: {
    202: responseSchema,
    400: z.object({ error: z.string(), details: z.array(z.any()).optional() }),
  },
};

export const handler: Handlers['GenerateAppAPI'] = async (req, { emit, logger, state, streams, traceId }) => {
  // Parse and validate input
  const appSpec = bodySchema.parse(req.body);
  
  // Generate unique flow ID
  const flowId = `app-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  logger.info('App generation request received', {
    flowId,
    title: appSpec.title,
    genre: appSpec.genre,
    features: appSpec.features.length,
  });

  // Initialize workflow state
  const workflowState = {
    flowId,
    status: 'requested' as const,
    phases: [
      { name: 'design', status: 'pending' as const },
      { name: 'coding', status: 'pending' as const },
      { name: 'testing', status: 'pending' as const },
      { name: 'assembly', status: 'pending' as const },
    ],
    currentPhase: 'design',
    currentIteration: 1,
    maxIterations: appSpec.maxIterations || 3,
    appSpec,
    modules: [],
    testReports: [],
    artifacts: {},
    metrics: {
      totalTokens: 0,
      estimatedCost: 0,
      totalDuration: 0,
    },
    errors: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Store initial state
  await state.set('workflows', flowId, workflowState);
  
  // Send initial progress update via stream
  const progressEvent = createProgressEvent({
    flowId,
    phase: 'requested',
    agent: 'system',
    message: 'App generation request received. Initializing AI agent pipeline...',
    progress: 5,
    details: {
      totalModules: 0,
      modulesCompleted: 0,
      iteration: 1,
    },
  });
  
  await streams.appGenerationProgress.set(flowId, progressEvent.id, progressEvent);

  // Emit event to start the architect agent
  await emit({
    topic: 'app_generation.requested',
    data: {
      flowId,
      appSpec,
    },
  });

  logger.info('App generation workflow initiated', { flowId, traceId });

  // Calculate estimated time based on complexity
  const featureCount = appSpec.features.length;
  const estimatedMinutes = Math.max(5, featureCount * 2 + 10);

  return {
    status: 202,
    body: {
      success: true,
      flowId,
      message: `App generation started for "${appSpec.title}". The AI agent team is now working on your application.`,
      estimatedTime: `${estimatedMinutes}-${estimatedMinutes + 10} minutes`,
      statusEndpoint: `/apps/${flowId}/status`,
      streamEndpoint: `/streams/appGenerationProgress?groupId=${flowId}`,
    },
  };
};

