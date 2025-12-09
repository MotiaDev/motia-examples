/**
 * Test Passed Handler Event Step
 * 
 * Handles successful test completion for modules.
 * Updates module status and checks if all modules are complete.
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { CodeModuleSchema, TestReportSchema } from '../../src/types/app-generator.types';
import { createProgressEvent } from '../../src/services/progress.service';

const inputSchema = z.object({
  flowId: z.string(),
  moduleId: z.string(),
  testReport: TestReportSchema,
  codeModule: CodeModuleSchema,
  warnings: z.array(z.string()).optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'TestPassedHandler',
  description: 'Handles successful test completion and checks for workflow completion',
  subscribes: ['tests.passed'],
  emits: [
    { topic: 'all_modules.tested', label: 'All modules passed tests' },
  ],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['TestPassedHandler'] = async (input, { emit, logger, state, streams }) => {
  const { flowId, moduleId, testReport, codeModule, warnings } = input;
  
  logger.info('Module tests passed', { 
    flowId, 
    moduleId,
    passed: testReport.passedTests,
    total: testReport.totalTests,
    hasWarnings: !!warnings?.length,
  });

  // Update workflow state
  const workflowState = await state.get<any>('workflows', flowId);
  
  if (!workflowState) {
    logger.error('Workflow not found', { flowId });
    return;
  }

  // Update module status
  const moduleIndex = workflowState.modules?.findIndex((m: any) => m.id === moduleId);
  if (moduleIndex >= 0) {
    workflowState.modules[moduleIndex] = {
      ...workflowState.modules[moduleIndex],
      status: 'passed',
    };
  }

  // Check if all modules have passed
  const allModules = workflowState.modules || [];
  const passedModules = allModules.filter((m: any) => m.status === 'passed');
  const allModulesPassed = passedModules.length === allModules.length && allModules.length > 0;

  workflowState.updatedAt = new Date().toISOString();
  await state.set('workflows', flowId, workflowState);

  // Update progress
  await streams.appGenerationProgress.set(flowId, `${flowId}-testpassed-${moduleId}`, createProgressEvent({
    flowId,
    phase: 'testing',
    agent: 'test-executor',
    message: `${codeModule.name} passed all tests!${warnings?.length ? ` (${warnings.length} warnings)` : ''}`,
    progress: allModulesPassed ? 80 : 70,
    details: {
      currentModule: codeModule.name,
      modulesCompleted: passedModules.length,
      totalModules: allModules.length,
      testsPassed: testReport.passedTests,
      testsRun: testReport.totalTests,
    },
  }));

  if (allModulesPassed) {
    logger.info('All modules tested successfully, triggering assembly', { 
      flowId,
      totalModules: allModules.length,
    });

    // Get design document
    const designDocument = await state.get<any>('designs', flowId);

    // Trigger assembly
    await emit({
      topic: 'all_modules.tested',
      data: {
        flowId,
        designDocument,
        modules: allModules,
      },
    });
  }
};

