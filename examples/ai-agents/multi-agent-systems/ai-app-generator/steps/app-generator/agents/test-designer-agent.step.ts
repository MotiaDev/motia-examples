/**
 * Test Designer Agent Event Step
 * 
 * The Test Designer agent that:
 * - Receives generated code modules
 * - Designs comprehensive test cases
 * - Covers happy paths and edge cases
 * - Outputs Vitest/Jest test files
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { 
  CodeModuleSchema,
  type TestCase,
} from '../../../src/types/app-generator.types';
import { generateForAgent } from '../../../src/services/llm';
import { createProgressEvent } from '../../../src/services/progress.service';

const inputSchema = z.object({
  flowId: z.string(),
  moduleId: z.string(),
  codeModule: CodeModuleSchema,
});

export const config: EventConfig = {
  type: 'event',
  name: 'TestDesignerAgent',
  description: 'AI Test Designer agent that creates comprehensive test cases for generated code',
  subscribes: ['module_coding.completed'],
  emits: [
    { topic: 'tests_designed.ready', label: 'Tests ready for execution' },
    { topic: 'app_generation.failed', label: 'Test design failed', conditional: true },
  ],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['TestDesignerAgent'] = async (input, { emit, logger, state, streams }) => {
  const { flowId, moduleId, codeModule } = input;
  
  logger.info('Test Designer Agent started', { 
    flowId, 
    moduleId,
    moduleName: codeModule.name,
    filesCount: codeModule.files.length,
  });

  // Update progress
  await streams.appGenerationProgress.set(flowId, `${flowId}-testdesign-${moduleId}`, createProgressEvent({
    flowId,
    phase: 'testing',
    agent: 'test-designer',
    message: `Designing tests for ${codeModule.name}...`,
    progress: 55,
    details: {
      currentModule: codeModule.name,
    },
  }));

  try {
    // Generate test cases using LLM
    const testPrompt = buildTestDesignPrompt(codeModule);
    
    const response = await generateForAgent('testDesigner', [
      { role: 'system', content: TEST_DESIGNER_SYSTEM_PROMPT },
      { role: 'user', content: testPrompt },
    ]);

    logger.info('Test Designer LLM response received', {
      flowId,
      moduleId,
      tokens: response.usage.totalTokens,
    });

    // Parse test cases from response
    const testCases = parseTestCases(response.content, moduleId, flowId);

    // Update workflow state
    const workflowState = await state.get<any>('workflows', flowId);
    if (workflowState) {
      workflowState.metrics.totalTokens += response.usage.totalTokens;
      workflowState.metrics.estimatedCost += response.estimatedCost;
      workflowState.updatedAt = new Date().toISOString();
      await state.set('workflows', flowId, workflowState);
    }

    // Store test cases
    await state.set('testCases', `${flowId}-${moduleId}`, testCases);

    // Emit tests ready for execution
    await emit({
      topic: 'tests_designed.ready',
      data: {
        flowId,
        moduleId,
        testCases,
        codeModule,
      },
    });

    logger.info('Test Designer Agent completed', { 
      flowId, 
      moduleId,
      testCasesGenerated: testCases.length,
    });

  } catch (error: any) {
    logger.error('Test Designer Agent failed', { flowId, moduleId, error: error.message });

    await streams.appGenerationProgress.set(flowId, `${flowId}-testdesign-failed-${moduleId}`, createProgressEvent({
      flowId,
      phase: 'failed',
      agent: 'test-designer',
      message: `Test design failed for ${codeModule.name}: ${error.message}`,
      progress: 0,
    }));

    await emit({
      topic: 'app_generation.failed',
      data: { flowId, phase: 'test-design', moduleId, error: error.message },
    });
  }
};

const TEST_DESIGNER_SYSTEM_PROMPT = `You are an expert QA engineer specializing in React and TypeScript testing with Vitest.

Your task is to design comprehensive test cases. Output tests in this format:

===TEST: test-file-path.test.ts===
import { describe, it, expect, vi } from 'vitest';
// ... imports

describe('ComponentName', () => {
  it('should render correctly', () => {
    // Test implementation
  });
  
  // More tests...
});
===END TEST===

Guidelines:
1. Use Vitest syntax (describe, it, expect, vi for mocking)
2. Test both happy paths and edge cases
3. Include accessibility tests where relevant
4. Mock external dependencies properly
5. Test component props and state changes
6. Include integration tests for complex interactions
7. Use @testing-library/react for component testing
8. Write clear, descriptive test names
9. Group related tests with describe blocks
10. Include error boundary and error state tests

For each component, include:
- Rendering tests
- User interaction tests
- Props validation tests
- Edge case handling
- Error state tests`;

function buildTestDesignPrompt(codeModule: any): string {
  const fileContents = codeModule.files
    .filter((f: any) => !f.path.includes('.test.') && !f.path.includes('.spec.'))
    .map((f: any) => `**File: ${f.path}**\n\`\`\`${f.language}\n${f.content}\n\`\`\``)
    .join('\n\n');

  return `Design comprehensive test cases for the following code module:

**Module:** ${codeModule.name}
**Description:** ${codeModule.description}

**Source Files:**
${fileContents}

Generate Vitest test files that cover:
1. Component rendering and structure
2. User interactions (clicks, inputs, etc.)
3. Props validation and edge cases
4. State management and updates
5. Error handling
6. Accessibility compliance

Use @testing-library/react for component testing. Include mocks for any external dependencies.`;
}

function parseTestCases(llmResponse: string, moduleId: string, flowId: string): TestCase[] {
  const testCases: TestCase[] = [];
  const timestamp = new Date().toISOString();
  
  // Parse test files from the response format
  const testRegex = /===TEST:\s*([^\s]+)\s*===\n([\s\S]*?)===END TEST===/g;
  let match;
  let testIndex = 0;
  
  while ((match = testRegex.exec(llmResponse)) !== null) {
    const targetFile = match[1].trim();
    const code = match[2].trim();
    
    // Extract test names from the code
    const describeMatches = code.matchAll(/describe\(['"`]([^'"`]+)['"`]/g);
    const itMatches = code.matchAll(/it\(['"`]([^'"`]+)['"`]/g);
    
    const testNames: string[] = [];
    for (const m of describeMatches) testNames.push(`describe: ${m[1]}`);
    for (const m of itMatches) testNames.push(m[1]);
    
    testCases.push({
      id: `${flowId}-${moduleId}-test-${testIndex++}`,
      moduleId,
      name: testNames.join(', ').slice(0, 100) || `Test suite for ${targetFile}`,
      description: `Comprehensive tests for ${targetFile}`,
      type: 'unit',
      code,
      targetFile,
      createdAt: timestamp,
    });
  }

  // If no tests were parsed, create a placeholder
  if (testCases.length === 0) {
    // Try to extract from markdown code blocks
    const codeMatch = llmResponse.match(/```(?:tsx?|typescript|javascript)?\s*([\s\S]*?)```/);
    if (codeMatch) {
      testCases.push({
        id: `${flowId}-${moduleId}-test-0`,
        moduleId,
        name: 'Generated test suite',
        description: 'Auto-generated test cases',
        type: 'unit',
        code: codeMatch[1].trim(),
        targetFile: `${moduleId}.test.ts`,
        createdAt: timestamp,
      });
    }
  }

  return testCases;
}

