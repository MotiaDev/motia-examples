/**
 * Test Executor Agent Event Step
 * 
 * The Test Executor agent that:
 * - Receives test cases and code modules
 * - Simulates test execution
 * - Generates detailed test reports
 * - Routes failures back to the code refiner
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { 
  CodeModuleSchema,
  TestCaseSchema,
  type TestReport,
  type TestResult,
} from '../../../src/types/app-generator.types';
import { createProgressEvent } from '../../../src/services/progress.service';

const inputSchema = z.object({
  flowId: z.string(),
  moduleId: z.string(),
  testCases: z.array(TestCaseSchema),
  codeModule: CodeModuleSchema,
});

export const config: EventConfig = {
  type: 'event',
  name: 'TestExecutorAgent',
  description: 'Test Executor agent that runs tests and reports results',
  subscribes: ['tests_designed.ready'],
  emits: [
    { topic: 'tests.passed', label: 'All tests passed' },
    { topic: 'tests.failed', label: 'Tests failed, needs refinement', conditional: true },
  ],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['TestExecutorAgent'] = async (input, { emit, logger, state, streams }) => {
  const { flowId, moduleId, testCases, codeModule } = input;
  
  logger.info('Test Executor Agent started', { 
    flowId, 
    moduleId,
    testCount: testCases.length,
  });

  // Update progress
  await streams.appGenerationProgress.set(flowId, `${flowId}-testexec-${moduleId}`, createProgressEvent({
    flowId,
    phase: 'testing',
    agent: 'test-executor',
    message: `Executing tests for ${codeModule.name}...`,
    progress: 60,
    details: {
      currentModule: codeModule.name,
      testsRun: 0,
      testsPassed: 0,
    },
  }));

  try {
    // Get current workflow state
    const workflowState = await state.get<any>('workflows', flowId);
    const currentIteration = workflowState?.currentIteration || 1;
    const maxIterations = workflowState?.maxIterations || 3;

    // Simulate test execution
    // In a real implementation, this would actually run the tests
    const results = await simulateTestExecution(testCases, codeModule, currentIteration);
    
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    const allPassed = failedTests === 0;

    // Create test report
    const testReport: TestReport = {
      flowId,
      moduleId,
      iteration: currentIteration,
      totalTests: testCases.length,
      passedTests,
      failedTests,
      results,
      summary: allPassed 
        ? `All ${passedTests} tests passed for ${codeModule.name}`
        : `${failedTests} of ${testCases.length} tests failed for ${codeModule.name}`,
      createdAt: new Date().toISOString(),
    };

    // Store test report
    await state.set('testReports', `${flowId}-${moduleId}-${currentIteration}`, testReport);

    // Update workflow state
    if (workflowState) {
      workflowState.testReports = workflowState.testReports || [];
      workflowState.testReports.push(testReport);
      workflowState.updatedAt = new Date().toISOString();
      await state.set('workflows', flowId, workflowState);
    }

    // Update progress
    await streams.appGenerationProgress.set(flowId, `${flowId}-testexec-result-${moduleId}`, createProgressEvent({
      flowId,
      phase: 'testing',
      agent: 'test-executor',
      message: allPassed 
        ? `All tests passed for ${codeModule.name}!`
        : `${failedTests} tests failed for ${codeModule.name}`,
      progress: 65,
      details: {
        currentModule: codeModule.name,
        testsRun: testCases.length,
        testsPassed: passedTests,
        iteration: currentIteration,
      },
    }));

    if (allPassed) {
      // All tests passed, mark module as complete
      await emit({
        topic: 'tests.passed',
        data: {
          flowId,
          moduleId,
          testReport,
          codeModule: { ...codeModule, status: 'passed' },
        },
      });

      logger.info('Test Executor Agent completed - all tests passed', { 
        flowId, 
        moduleId,
        passedTests,
      });
    } else {
      // Tests failed, check if we can retry
      if (currentIteration < maxIterations) {
        // Route to code refiner
        await emit({
          topic: 'tests.failed',
          data: {
            flowId,
            moduleId,
            codeModule,
            testReport,
            iteration: currentIteration,
          },
        });

        logger.info('Test Executor Agent - tests failed, routing to refiner', { 
          flowId, 
          moduleId,
          failedTests,
          iteration: currentIteration,
        });
      } else {
        // Max iterations reached, mark as passed with warnings
        logger.warn('Test Executor Agent - max iterations reached', { 
          flowId, 
          moduleId,
          failedTests,
        });

        await emit({
          topic: 'tests.passed',
          data: {
            flowId,
            moduleId,
            testReport,
            codeModule: { ...codeModule, status: 'passed' },
            warnings: [`${failedTests} tests still failing after ${maxIterations} iterations`],
          },
        });
      }
    }

  } catch (error: any) {
    logger.error('Test Executor Agent failed', { flowId, moduleId, error: error.message });

    await streams.appGenerationProgress.set(flowId, `${flowId}-testexec-failed-${moduleId}`, createProgressEvent({
      flowId,
      phase: 'failed',
      agent: 'test-executor',
      message: `Test execution failed: ${error.message}`,
      progress: 0,
    }));
  }
};

/**
 * Simulate test execution
 * In a real implementation, this would use a test runner
 */
async function simulateTestExecution(
  testCases: any[],
  codeModule: any,
  iteration: number
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const timestamp = new Date().toISOString();

  for (const testCase of testCases) {
    // Simulate test execution with varying pass rates
    // Higher iterations have better pass rates (simulating code improvements)
    const basePassRate = 0.7;
    const iterationBonus = (iteration - 1) * 0.15;
    const passRate = Math.min(0.95, basePassRate + iterationBonus);
    
    const passed = Math.random() < passRate;
    
    results.push({
      testId: testCase.id,
      moduleId: testCase.moduleId,
      passed,
      duration: Math.floor(Math.random() * 500) + 50, // 50-550ms
      errorMessage: passed ? undefined : generateMockError(testCase.name),
      stackTrace: passed ? undefined : generateMockStackTrace(testCase.targetFile),
      executedAt: timestamp,
    });
  }

  return results;
}

function generateMockError(testName: string): string {
  const errors = [
    `Expected element to be visible but it was not found`,
    `Assertion failed: expected true but received false`,
    `TypeError: Cannot read property 'onClick' of undefined`,
    `Component did not render expected children`,
    `Mock function was not called with expected arguments`,
  ];
  return errors[Math.floor(Math.random() * errors.length)];
}

function generateMockStackTrace(targetFile: string): string {
  return `at Object.<anonymous> (${targetFile}:42:17)
    at Promise.then.completed
    at processTicksAndRejections (internal/process/task_queues.js:97:5)`;
}

