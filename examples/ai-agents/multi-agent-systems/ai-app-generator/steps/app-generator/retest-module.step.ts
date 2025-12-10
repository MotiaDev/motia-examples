/**
 * Retest Module Event Step
 * 
 * Re-runs tests on refined code modules.
 * Part of the code → test → refine feedback loop.
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { CodeModuleSchema, TestCaseSchema } from '../../src/types/app-generator.types';
import { createProgressEvent } from '../../src/services/progress.service';

const inputSchema = z.object({
  flowId: z.string(),
  moduleId: z.string(),
  codeModule: CodeModuleSchema,
  testCases: z.array(TestCaseSchema),
});

export const config: EventConfig = {
  type: 'event',
  name: 'RetestModule',
  description: 'Re-runs tests on refined code modules',
  subscribes: ['code_refined.ready'],
  emits: [
    { topic: 'tests_designed.ready', label: 'Triggers test execution' },
  ],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['RetestModule'] = async (input, { emit, logger, state, streams }) => {
  const { flowId, moduleId, codeModule, testCases } = input;
  
  logger.info('Retesting refined module', { 
    flowId, 
    moduleId,
    iteration: codeModule.iteration,
  });

  // Update progress
  await streams.appGenerationProgress.set(flowId, `${flowId}-retest-${moduleId}`, createProgressEvent({
    flowId,
    phase: 'testing',
    agent: 'test-executor',
    message: `Re-running tests for ${codeModule.name} (iteration ${codeModule.iteration})...`,
    progress: 75,
    details: {
      currentModule: codeModule.name,
      iteration: codeModule.iteration,
    },
  }));

  // Route to test executor
  await emit({
    topic: 'tests_designed.ready',
    data: {
      flowId,
      moduleId,
      testCases,
      codeModule,
    },
  });

  logger.info('Retest triggered', { flowId, moduleId });
};

