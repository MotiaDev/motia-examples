import { EventConfig, Handlers } from 'motia';
import { testsInputSchema, generateTests } from '../services/tests';
import { getErrorMessage } from '../services/utils';

// Use shared input schema from lib/tests
const inputSchema = testsInputSchema;

// Proper EventConfig with Motia patterns
export const config: EventConfig = {
  type: 'event',
  name: 'test-generator',
  description: 'Generates comprehensive test cases for the target repository using NVIDIA NIM',
  subscribes: ['diagrams.generated'],
  emits: ['tests.generated', 'tests.generation.error'],
  input: inputSchema,
  flows: ['nvidia-doc-flow']
};
// Lean handler delegating to lib/tests
export const handler: Handlers['test-generator'] = async (input, { logger, emit, state }) => {
  try {
    logger.info('Starting test case generation from repository analysis');
    const payload = await generateTests(input as any, logger as any);
    // await emit({ topic: 'tests.generated', data: payload });
    await state.set('test_generation', 'latest_tests', payload);
    logger.info('🎉 Test generation completed successfully! 🎉');
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    await (emit as any)({ topic: 'tests.generation.error', data: { repo_url: (input as any).repo_url, error: errorMessage } as any });
    throw error;
  }
};
