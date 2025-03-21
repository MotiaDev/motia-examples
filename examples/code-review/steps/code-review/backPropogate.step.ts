// 4. Backpropagate activity
import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import { nodeSchema, SimulationResult, simulationResultSchema } from '../shared/agents/claude';

const backpropagateInputSchema = z.object({
  nodes: z.record(z.string(), nodeSchema),
  rootId: z.string(),
  simulationResult: simulationResultSchema,
  maxIterations: z.number(),
  currentIteration: z.number(),
  explorationConstant: z.number(),
  maxDepth: z.number(),
  outputPath: z.string().optional()
});

export type BackpropagateInput = z.infer<typeof backpropagateInputSchema>;

export const config: EventConfig = {
  type: 'event',
  name: 'Backpropagate',
  description: 'Updates node statistics based on simulation results',
  subscribes: ['mcts.simulation.completed'],
  emits: ['mcts.backpropagation.completed', 'mcts.iteration.started', 'mcts.iterations.completed'],
  flows: ['code-review-flow'],
  input: backpropagateInputSchema
};

export const handler: StepHandler<typeof config> = async (input: BackpropagateInput, { emit, logger, state, traceId }) => {
  try {
    console.log('Backpropagation handler received input:', JSON.stringify(input, null, 2).substring(0, 300) + '...');
    
    const { nodes, rootId, simulationResult, maxIterations, currentIteration, explorationConstant, maxDepth, outputPath } = input;
    const { nodeId, value } = simulationResult;
    
    console.log('Processing simulationResult:', JSON.stringify(simulationResult, null, 2));
    
    // Validate the node exists
    if (!nodes[nodeId]) {
      logger.error('Simulation node not found in tree', { nodeId });
      console.log('ERROR: Node not found in tree:', nodeId);
      return;
    }
    
    // Record the path for logging
    const backpropagationPath: string[] = [];
    
    // Update node statistics
    let currentNode = nodes[nodeId];
    let currentNodeId = nodeId;
    
    // Start from the simulated node
    backpropagationPath.push(currentNodeId);
    
    // Update the visits and value of the simulated node
    currentNode.visits += 1;
    currentNode.value += value;
    
    // Propagate updates to parent nodes
    while (currentNode.parent) {
      currentNodeId = currentNode.parent;
      currentNode = nodes[currentNodeId];
      
      // Validate parent node exists
      if (!currentNode) {
        logger.error('Parent node not found in tree', { nodeId: currentNodeId });
        console.log('ERROR: Parent node not found:', currentNodeId);
        return;
      }
      
      // Add to the path
      backpropagationPath.push(currentNodeId);
      
      // Update statistics
      currentNode.visits += 1;
      currentNode.value += value;
    }
    
    logger.info('Backpropagation completed', {
      path: backpropagationPath,
      value,
      currentIteration,
      maxIterations
    });
    
    console.log('Backpropagation path:', backpropagationPath);
    
    // Check if we've reached the max iterations
    const nextIteration = currentIteration + 1;
    const isComplete = nextIteration >= maxIterations;
    
    // Emit backpropagation completed event
    console.log('Emitting mcts.backpropagation.completed event');
    await emit({
      topic: 'mcts.backpropagation.completed',
      data: {
        nodes,
        rootId,
        maxIterations,
        currentIteration: nextIteration,
        explorationConstant,
        maxDepth,
        outputPath
      }
    });
    console.log('Emitted mcts.backpropagation.completed event');
    
    if (isComplete) {
      console.log('Max iterations reached, emitting mcts.iterations.completed');
      logger.info('MCTS process completed', {
        totalIterations: nextIteration,
        rootNodeVisits: nodes[rootId].visits,
        rootNodeValue: nodes[rootId].value
      });
      
      // Emit the tree for final move selection
      await emit({
        topic: 'mcts.iterations.completed',
        data: {
          nodes,
          rootId,
          maxIterations,
          currentIteration: nextIteration,
          explorationConstant,
          maxDepth,
          isComplete: true,
          outputPath
        }
      });
      console.log('Emitted mcts.iterations.completed event');
    } else {
      console.log('Starting next iteration, emitting mcts.iteration.started');
      // Emit the updated tree for the next iteration
      await emit({
        topic: 'mcts.iteration.started',
        data: {
          nodes,
          rootId,
          currentNodeId: rootId,
          maxIterations,
          currentIteration: nextIteration,
          explorationConstant,
          maxDepth,
          outputPath
        }
      });
      console.log('Emitted mcts.iteration.started event');
      
      logger.info('Starting next MCTS iteration', {
        iteration: nextIteration,
        maxIterations
      });
    }
  } catch (error) {
    // Create a safe error object without circular references
    const safeError = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown Error',
      stack: error instanceof Error ? error.stack : undefined
    };
    
    console.log('ERROR in backpropagation step:', safeError);
    logger.error('Error during backpropagation', safeError);
  }
};  