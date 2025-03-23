// 4. Backpropagate activity
import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import { NodeSchema, SimulationResultSchema } from '../shared/models';

const backpropagateInputSchema = z.object({
  nodes: z.record(z.string(), NodeSchema),
  root_id: z.string(),
  simulation_result: SimulationResultSchema,
  max_iterations: z.number(),
  current_iteration: z.number(),
  exploration_constant: z.number(),
  max_depth: z.number(),
  output_path: z.string().optional(),
  repository: z.string().optional(),
  requirements: z.string().optional(),
  branch: z.string().optional()
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
    
    const { nodes, root_id, simulation_result, max_iterations, current_iteration, exploration_constant, max_depth, output_path } = input;
    const nodeId = simulation_result.nodeId;
    const value = simulation_result.value;
    
    // Extract additional fields from input that may be needed for downstream steps
    const repository = input.repository || '';
    const requirements = input.requirements || 'No requirements specified';
    const branch = input.branch || 'main';
    
    console.log('Processing simulationResult:', JSON.stringify(simulation_result, null, 2));
    
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
      current_iteration,
      max_iterations
    });
    
    console.log('Backpropagation path:', backpropagationPath);
    
    // Check if we've reached the max iterations
    const nextIteration = current_iteration + 1;
    const isComplete = nextIteration >= max_iterations;
    
    // Emit backpropagation completed event
    console.log('Emitting mcts.backpropagation.completed event');
    await emit({
      topic: 'mcts.backpropagation.completed',
      data: {
        nodes,
        root_id,
        max_iterations,
        current_iteration: nextIteration,
        exploration_constant,
        max_depth,
        output_path,
        repository,
        requirements,
        branch,
        topic: 'mcts.backpropagation.completed'
      }
    });
    console.log('Emitted mcts.backpropagation.completed event');
    
    if (isComplete) {
      console.log('Max iterations reached, emitting mcts.iterations.completed');
      logger.info('MCTS process completed', {
        total_iterations: nextIteration,
        root_node_visits: nodes[root_id].visits,
        root_node_value: nodes[root_id].value
      });
      
      // Emit the tree for final move selection
      await emit({
        topic: 'mcts.iterations.completed',
        data: {
          nodes,
          root_id,
          max_iterations,
          current_iteration: nextIteration,
          exploration_constant,
          max_depth,
          is_complete: true,
          output_path,
          repository,
          requirements,
          branch
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
          root_id,
          current_node_id: root_id,
          max_iterations,
          current_iteration: nextIteration,
          exploration_constant,
          max_depth,
          output_path,
          repository,
          requirements,
          branch
        }
      });
      console.log('Emitted mcts.iteration.started event');
      
      logger.info('Starting next MCTS iteration', {
        iteration: nextIteration,
        max_iterations
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