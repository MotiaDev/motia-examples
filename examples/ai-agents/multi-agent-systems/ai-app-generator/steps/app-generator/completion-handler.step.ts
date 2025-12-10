/**
 * Completion Handler Event Step
 * 
 * Handles the final completion of the app generation workflow.
 * Logs final metrics and notifies any listening systems.
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { FinalOutputSchema } from '../../src/types/app-generator.types';

const inputSchema = z.object({
  flowId: z.string(),
  finalOutput: FinalOutputSchema,
});

export const config: EventConfig = {
  type: 'event',
  name: 'CompletionHandler',
  description: 'Handles final workflow completion and cleanup',
  subscribes: ['app_generation.completed'],
  emits: [],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['CompletionHandler'] = async (input, { logger, state }) => {
  const { flowId, finalOutput } = input;
  
  logger.info('App generation completed!', {
    flowId,
    appTitle: finalOutput.appSpec.title,
    totalFiles: finalOutput.totalFiles,
    totalLines: finalOutput.totalLines,
    generatedAt: finalOutput.generatedAt,
  });

  // Get final workflow state for metrics
  const workflowState = await state.get<any>('workflows', flowId);
  
  if (workflowState) {
    logger.info('Final workflow metrics', {
      flowId,
      totalTokens: workflowState.metrics?.totalTokens || 0,
      estimatedCost: `$${(workflowState.metrics?.estimatedCost || 0).toFixed(4)}`,
      iterations: workflowState.currentIteration,
      modulesGenerated: workflowState.modules?.length || 0,
      testReports: workflowState.testReports?.length || 0,
    });
  }

  // Log completion summary
  logger.info('='.repeat(50));
  logger.info(`🎉 Application "${finalOutput.appSpec.title}" generated successfully!`);
  logger.info(`📁 ${finalOutput.totalFiles} files | ${finalOutput.totalLines} lines of code`);
  logger.info(`📥 Download at: /apps/${flowId}/download`);
  logger.info('='.repeat(50));
};

