/**
 * Failure Handler Event Step
 * 
 * Handles workflow failures and performs cleanup.
 * Logs error details and updates workflow state.
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { createProgressEvent } from '../../src/services/progress.service';

const inputSchema = z.object({
  flowId: z.string(),
  phase: z.string(),
  moduleId: z.string().optional(),
  error: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'FailureHandler',
  description: 'Handles workflow failures and performs cleanup',
  subscribes: ['app_generation.failed'],
  emits: [],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['FailureHandler'] = async (input, { logger, state, streams }) => {
  const { flowId, phase, moduleId, error } = input;
  
  logger.error('App generation failed', {
    flowId,
    phase,
    moduleId,
    error,
  });

  // Update workflow state
  const workflowState = await state.get<any>('workflows', flowId);
  
  if (workflowState) {
    workflowState.status = 'failed';
    workflowState.errors = workflowState.errors || [];
    workflowState.errors.push({
      phase,
      moduleId,
      message: error,
      timestamp: new Date().toISOString(),
    });
    workflowState.updatedAt = new Date().toISOString();
    
    await state.set('workflows', flowId, workflowState);
  }

  // Update progress stream
  await streams.appGenerationProgress.set(flowId, `${flowId}-failed`, createProgressEvent({
    flowId,
    phase: 'failed',
    agent: 'system',
    message: `Generation failed during ${phase}: ${error}`,
    progress: 0,
    details: {
      currentModule: moduleId,
    },
  }));

  // Log failure summary
  logger.error('='.repeat(50));
  logger.error(`❌ App generation failed for flow: ${flowId}`);
  logger.error(`Phase: ${phase}`);
  logger.error(`Error: ${error}`);
  logger.error('='.repeat(50));
};

