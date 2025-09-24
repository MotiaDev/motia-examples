import { EventConfig, Handlers } from 'motia';
import { reviewInputSchema, reviewDocumentation } from '../services/qa';
import { getErrorMessage } from '../services/utils';

// Use shared review input schema from lib
const inputSchema = reviewInputSchema;

// Proper EventConfig with Motia patterns
export const config: EventConfig = {
  type: 'event',
  name: 'documentation-qa-reviewer',
  description: 'Reviews and enhances generated documentation using NVIDIA NIM for quality assurance',
  subscribes: ['docs.generated'],
  emits: ['docs.reviewed', 'docs.review.error'],
  input: inputSchema,
  flows: ['nvidia-doc-flow']
};
// Lean handler delegating to lib/qa
export const handler: Handlers['documentation-qa-reviewer'] = async (input, { logger, emit, state }) => {
  try {
    logger.info('Starting QA review and enhancement of generated documentation');
    const reviewedPayload = await reviewDocumentation(input as any, logger as any);
    await emit({ topic: 'docs.reviewed', data: reviewedPayload });
    await state.set('documentation', 'reviewed_docs', reviewedPayload);
    logger.info('🎉 Documentation QA review completed! 🎉');
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    await (emit as any)({ topic: 'docs.review.error', data: { repo_url: (input as any).repo_url, error: errorMessage } as any });
    throw error;
  }
};
