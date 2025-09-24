import { EventConfig, Handlers } from 'motia';
import { analysisSchema, generateDocumentation } from '../services/docs';
import { getErrorMessage } from '../services/utils';

// Use shared analysis schema from lib
const inputSchema = analysisSchema;

// Proper EventConfig with Motia patterns
export const config: EventConfig = {
  type: 'event',
  name: 'documentation-generator',
  description: 'Generates comprehensive documentation from repository analysis using NVIDIA NIM',
  subscribes: ['repo.analyzed'],
  emits: ['docs.generated', 'docs.generation.error'],
  input: inputSchema,
  flows: ['nvidia-doc-flow']
};
// Lean handler delegating to lib/docs
export const handler: Handlers['documentation-generator'] = async (input, { logger, emit, state }) => {
  try {
    logger.info('Starting documentation generation from repository analysis');
    const payload = await generateDocumentation(input as any, logger as any);
    await emit({ topic: 'docs.generated', data: payload });
    await state.set('documentation', 'latest_docs', payload);
    logger.info('📚 Documentation generation completed successfully!');
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    await (emit as any)({
      topic: 'docs.generation.error',
      data: { repo_url: (input as any).repo_url, error: errorMessage, timestamp: new Date().toISOString() } as any
    });
    throw error;
  }
};
