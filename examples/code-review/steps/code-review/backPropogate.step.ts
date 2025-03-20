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
  maxDepth: z.number()
});

export type BackpropagateInput = z.infer<typeof backpropagateInputSchema>;

export const config: EventConfig = {
  type: 'event',
  name: 'Backpropagate',
  description: 'Updates node statistics based on simulation results',
  subscribes: ['mcts.simulation.completed'],
  emits: ['mcts.backpropagation.completed'],
  flows: ['code-review-flow'],
  input: backpropagateInputSchema
};

export const handler: StepHandler<typeof config> = async (input: BackpropagateInput, { emit, logger, state, traceId }) => {
  try {
    const { nodes, rootId, simulationResult, maxIterations, currentIteration, explorationConstant, maxDepth } = input;
    const { nodeId, value } = simulationResult;
    
    // Validate the node exists
    if (!nodes[nodeId]) {
      logger.error('Simulation node not found in tree', { nodeId });
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
    
    // Check if we've reached the max iterations
    const isComplete = currentIteration >= maxIterations;
    const nextIteration = currentIteration + 1;
    
    if (isComplete) {
      logger.info('MCTS process completed', {
        totalIterations: currentIteration,
        rootNodeVisits: nodes[rootId].visits,
        rootNodeValue: nodes[rootId].value
      });
    }
    
    // Emit updated state for next iteration or completion
    await emit({
      topic: 'mcts.backpropagation.completed',
      data: {
        nodes,
        rootId,
        maxIterations,
        currentIteration: nextIteration,
        explorationConstant,
        maxDepth,
        isComplete
      }
    });
  } catch (error) {
    logger.error('Error during backpropagation', error);
  }
};  