import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { analyzeRepository } from '../services/repoAnalysis';
import { getErrorMessage } from '../services/utils';

// Input schema for type safety
const inputSchema = z.object({
  repo_url: z.string().url()
});

// Configuration following Motia EventConfig pattern
export const config: EventConfig = {
  type: 'event',
  name: 'repository-analyzer',
  description: 'Analyzes GitHub repository structure and generates summary using NVIDIA NIM',
  subscribes: ['repo.requested'],
  emits: ['repo.analyzed'],
  input: inputSchema,
  flows: ['nvidia-doc-flow']
};

// Step file is intentionally lean; heavy lifting is in lib/repoAnalysis

// Properly typed Motia handler following the pattern
export const handler: Handlers['repository-analyzer'] = async (input, { logger, emit, state }) => {
  try {
    logger.info('Starting repository analysis:', { repo_url: input.repo_url });
    const repoUrl = input.repo_url;
    const analysisPayload = await analyzeRepository(repoUrl, logger as any);

     await emit({
       topic: 'repo.analyzed',
       data: analysisPayload
     });

     await state.set('repository_analysis', 'latest_analysis', analysisPayload);
     logger.info('Analysis results emitted and stored in state');
     // Do not return a value; handler must resolve to void per EventHandler type
     return;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(`Error analyzing repository: ${errorMessage}`);
    return; // Add return statement to ensure handler compiles cleanly
 }
};
