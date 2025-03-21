import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import { Commits } from '../shared/utils/repository';
import { evaluateCommits } from '../shared/agents/claude';

const mctsControllerInputSchema = z.object({
  prompt: z.string(),
  repoUrl: z.string(),
  branch: z.string(),
  maxIterations: z.number().default(100),
  explorationConstant: z.number().default(1.414),
  maxDepth: z.number().default(10),
  reviewStartCommit: z.string().optional(),
  reviewEndCommit: z.string().optional(),
  requirements: z.string(),
  outputPath: z.string().optional()
});
export type MCTSControllerInput = z.infer<typeof mctsControllerInputSchema>;

export const config: EventConfig = {
  type: 'event',
  name: 'MCTSController',
  description: 'Controls the MCTS process for code review reasoning',
  subscribes: ['review.requested', 'mcts.backpropagation.completed'],
  emits: ['mcts.iteration.started', 'mcts.iterations.completed', 'review.error'],
  flows: ['code-review-flow'],
  input: mctsControllerInputSchema
};

export const handler: StepHandler<typeof config> = async (input: MCTSControllerInput, { emit, logger, state, traceId }) => {
  console.log('Controller received event with input:', JSON.stringify({
    ...input,
    requirements: input.requirements ? 
      (input.requirements.length > 20 ? `${input.requirements.slice(0, 20)}...` : input.requirements) : undefined
  }, null, 2));
  
  logger.info('Analyzing review context', {
    ...input,
    requirements: input.requirements && input.requirements.length > 20
      ? `${input.requirements.slice(0, 20)}...`
      : input.requirements
  });

  // Store requirements in state for error handling
  await state.set(traceId, 'requirements', input.requirements);
 
  try {
    const commits = await Commits.create(traceId, state, input);
    const evaluation = await evaluateCommits(commits, input.prompt);

    // Define a unique root node ID
    const rootId = `root-${Date.now()}`;

    // For the first iteration, initialize the MCTS tree structure
    const nodes: Record<string, any> = {
      [rootId]: {
        id: rootId,
        parent: null,
        children: [],
        visits: 1,
        value: 0,
        state: evaluation.summary,
        isTerminal: false
      }
    };
  
    if (evaluation.score > 0.9 || input.maxIterations === 0) {
      // If the score is already high or no iterations requested, complete immediately
      await emit({
        topic: 'mcts.iterations.completed',
        data: {
          nodes,
          rootId,
          currentIteration: 0,
          maxIterations: input.maxIterations,
          explorationConstant: input.explorationConstant,
          maxDepth: input.maxDepth,
          outputPath: input.outputPath
        }
      });
      logger.info('Context analysis completed without iterations');
    } else {
      // Start the MCTS process
      await emit({
        topic: 'mcts.iteration.started',
        data: {
          nodes,
          rootId,
          currentNodeId: rootId,
          currentIteration: 0,
          maxIterations: input.maxIterations,
          explorationConstant: input.explorationConstant,
          maxDepth: input.maxDepth,
          outputPath: input.outputPath
        }
      });
      logger.info('MCTS process started');
    }
  } catch (error) {
    logger.error('Error in controller step', error);
    await emit({
      topic: 'review.error',
      data: {
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        repository: input.repoUrl,
        outputPath: input.outputPath
      }
    });
  }
};
