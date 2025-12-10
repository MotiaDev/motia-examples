/**
 * Code Refiner Agent Event Step
 * 
 * The Code Refiner agent that:
 * - Receives failed test reports
 * - Analyzes errors and failures
 * - Refines code to fix issues
 * - Re-triggers the test cycle
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { 
  CodeModuleSchema,
  TestReportSchema,
  type GeneratedFile,
} from '../../../src/types/app-generator.types';
import { generateForAgent } from '../../../src/services/llm';
import { createProgressEvent } from '../../../src/services/progress.service';

const inputSchema = z.object({
  flowId: z.string(),
  moduleId: z.string(),
  codeModule: CodeModuleSchema,
  testReport: TestReportSchema,
  iteration: z.number(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'CodeRefinerAgent',
  description: 'AI Code Refiner agent that fixes code based on test feedback',
  subscribes: ['tests.failed'],
  emits: [
    { topic: 'code_refined.ready', label: 'Refined code ready for re-testing' },
    { topic: 'app_generation.failed', label: 'Code refinement failed', conditional: true },
  ],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['CodeRefinerAgent'] = async (input, { emit, logger, state, streams }) => {
  const { flowId, moduleId, codeModule, testReport, iteration } = input;
  
  logger.info('Code Refiner Agent started', { 
    flowId, 
    moduleId,
    iteration,
    failedTests: testReport.failedTests,
  });

  // Update progress
  await streams.appGenerationProgress.set(flowId, `${flowId}-refiner-${moduleId}-${iteration}`, createProgressEvent({
    flowId,
    phase: 'refining',
    agent: 'engineer',
    message: `Refining ${codeModule.name} based on test feedback (iteration ${iteration + 1})...`,
    progress: 70 + (iteration * 5),
    details: {
      currentModule: codeModule.name,
      iteration: iteration + 1,
    },
  }));

  try {
    // Build refinement prompt with error context
    const refinementPrompt = buildRefinementPrompt(codeModule, testReport);
    
    const response = await generateForAgent('engineer', [
      { role: 'system', content: REFINER_SYSTEM_PROMPT },
      { role: 'user', content: refinementPrompt },
    ]);

    logger.info('Code Refiner LLM response received', {
      flowId,
      moduleId,
      tokens: response.usage.totalTokens,
    });

    // Parse refined code
    const refinedFiles = parseRefinedCode(response.content, codeModule);
    
    // Create refined module
    const refinedModule = {
      ...codeModule,
      files: refinedFiles,
      status: 'refined' as const,
      iteration: iteration + 1,
    };

    // Update workflow state
    const workflowState = await state.get<any>('workflows', flowId);
    if (workflowState) {
      workflowState.currentIteration = iteration + 1;
      workflowState.metrics.totalTokens += response.usage.totalTokens;
      workflowState.metrics.estimatedCost += response.estimatedCost;
      workflowState.updatedAt = new Date().toISOString();
      
      // Update module in the modules array
      const moduleIndex = workflowState.modules.findIndex((m: any) => m.id === moduleId);
      if (moduleIndex >= 0) {
        workflowState.modules[moduleIndex] = refinedModule;
      }
      
      await state.set('workflows', flowId, workflowState);
    }

    // Stream refined files
    for (const file of refinedFiles) {
      await streams.generatedFiles.set(flowId, file.path, {
        id: file.path,
        flowId,
        path: file.path,
        content: file.content,
        language: file.language,
        moduleType: file.moduleType,
        status: 'completed',
        generatedAt: file.generatedAt,
        linesOfCode: file.content.split('\n').length,
      });
    }

    // Re-trigger test cycle with refined code
    // Get test cases from state
    const testCases = await state.get<any>('testCases', `${flowId}-${moduleId}`);

    await emit({
      topic: 'code_refined.ready',
      data: {
        flowId,
        moduleId,
        codeModule: refinedModule,
        testCases: testCases || [],
      },
    });

    logger.info('Code Refiner Agent completed', { 
      flowId, 
      moduleId,
      newIteration: iteration + 1,
      filesRefined: refinedFiles.length,
    });

  } catch (error: any) {
    logger.error('Code Refiner Agent failed', { flowId, moduleId, error: error.message });

    await streams.appGenerationProgress.set(flowId, `${flowId}-refiner-failed-${moduleId}`, createProgressEvent({
      flowId,
      phase: 'failed',
      agent: 'engineer',
      message: `Code refinement failed: ${error.message}`,
      progress: 0,
    }));

    await emit({
      topic: 'app_generation.failed',
      data: { flowId, phase: 'refinement', moduleId, error: error.message },
    });
  }
};

const REFINER_SYSTEM_PROMPT = `You are an expert software engineer debugging and fixing React/TypeScript code.

Your task is to analyze test failures and fix the code. Output files in this format:

===FILE: path/to/file.tsx===
// Fixed file content here
===END FILE===

Guidelines:
1. Carefully analyze each error message and stack trace
2. Fix the root cause, not just the symptoms
3. Maintain existing code style and patterns
4. Add null checks and error handling where needed
5. Ensure TypeScript types are correct
6. Fix any accessibility issues
7. DO NOT truncate code - provide complete fixed files
8. Add comments explaining significant fixes`;

function buildRefinementPrompt(codeModule: any, testReport: any): string {
  // Get failed test results
  const failures = testReport.results.filter((r: any) => !r.passed);
  
  const failureDetails = failures.map((f: any) => 
    `- Test: ${f.testId}\n  Error: ${f.errorMessage}\n  Stack: ${f.stackTrace}`
  ).join('\n\n');

  const fileContents = codeModule.files
    .map((f: any) => `**File: ${f.path}**\n\`\`\`${f.language}\n${f.content}\n\`\`\``)
    .join('\n\n');

  return `Fix the following code based on test failures:

**Module:** ${codeModule.name}
**Current Iteration:** ${codeModule.iteration}
**Failed Tests:** ${failures.length}

**Test Failures:**
${failureDetails}

**Current Code:**
${fileContents}

Please analyze the test failures and provide fixed versions of all affected files. 
Ensure all tests will pass after your fixes. Provide complete file contents, do not truncate.`;
}

function parseRefinedCode(llmResponse: string, originalModule: any): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const timestamp = new Date().toISOString();
  
  // Parse files from the response format
  const fileRegex = /===FILE:\s*([^\s]+)\s*===\n([\s\S]*?)===END FILE===/g;
  let match;
  const refinedPaths = new Set<string>();
  
  while ((match = fileRegex.exec(llmResponse)) !== null) {
    const path = match[1].trim();
    const content = match[2].trim();
    refinedPaths.add(path);
    
    files.push({
      path,
      content,
      language: getLanguageFromPath(path),
      moduleType: getModuleTypeFromPath(path),
      generatedAt: timestamp,
      iteration: originalModule.iteration + 1,
    });
  }

  // Keep original files that weren't refined
  for (const originalFile of originalModule.files) {
    if (!refinedPaths.has(originalFile.path)) {
      files.push({
        ...originalFile,
        iteration: originalModule.iteration + 1,
      });
    }
  }

  // If no files were parsed, return original with incremented iteration
  if (files.length === 0) {
    return originalModule.files.map((f: any) => ({
      ...f,
      iteration: originalModule.iteration + 1,
    }));
  }

  return files;
}

function getLanguageFromPath(path: string): GeneratedFile['language'] {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  return 'typescript';
}

function getModuleTypeFromPath(path: string): GeneratedFile['moduleType'] {
  if (path.includes('/components/')) return 'component';
  if (path.includes('/hooks/')) return 'hook';
  if (path.includes('/services/')) return 'service';
  if (path.includes('/utils/')) return 'utility';
  if (path.includes('/types/')) return 'type';
  if (path.includes('.test.') || path.includes('.spec.')) return 'test';
  if (path.includes('/styles/') || path.endsWith('.css')) return 'style';
  return 'component';
}

