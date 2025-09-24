import { EventConfig, Handlers } from 'motia';
import { diagramInputSchema, generateDiagrams, toEmittedDiagramsData } from '../services/diagrams';
import { getErrorMessage } from '../services/utils';

// Use shared diagram input schema from lib
const inputSchema = diagramInputSchema;

// Proper EventConfig with Motia patterns
export const config: EventConfig = {
  type: 'event',
  name: 'mermaid-diagram-generator',
  description: 'Generates Mermaid diagrams from repository analysis and documentation',
  subscribes: ['docs.reviewed'],
  emits: ['diagrams.generated', 'diagrams.generation.error'],
  input: inputSchema,
  flows: ['nvidia-doc-flow']
};
// Lean handler delegating to lib/diagrams
export const handler: Handlers['mermaid-diagram-generator'] = async (input, { logger, emit, state }) => {
  try {
    logger.info('Starting Mermaid diagram generation from reviewed documentation');
    const payload = await generateDiagrams(input as any, logger as any);
    const emittedData = toEmittedDiagramsData(payload);
    await emit({ topic: 'diagrams.generated', data: emittedData as any });
    await state.set('diagrams', 'latest_diagrams', payload);
    logger.info('🎨 Mermaid diagram generation pipeline completed successfully!');
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    await (emit as any)({ topic: 'diagrams.generation.error', data: { repo_url: (input as any).repo_url, error: errorMessage } as any });
    throw error;
  }
};
