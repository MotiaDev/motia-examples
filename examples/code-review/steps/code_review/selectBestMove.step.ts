// 5. SelectBestMove activity
import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import { NodeSchema } from '../shared/models';

// Define the selection mode options
export type SelectionMode = 'visits' | 'value' | 'value-ratio';


const selectBestMoveInputSchema = z.object({
  nodes: z.record(z.string(), NodeSchema),
  root_id: z.string(),
  current_iteration: z.number(),
  max_iterations: z.number(),
  exploration_constant: z.number(),
  max_depth: z.number(),
  is_complete: z.boolean().optional().default(false),
  selection_mode: z.enum(['visits', 'value', 'value-ratio']).optional().default('visits'),
  output_url: z.string().optional()
});

export type SelectBestMoveInput = z.infer<typeof selectBestMoveInputSchema>;

export const config: EventConfig = {
  type: 'event',
  name: 'SelectBestMove',
  description: 'Selects the best reasoning path after MCTS iterations',
  subscribes: ['mcts.iterations.completed'],
  emits: ['code-review.reasoning.completed'],
  flows: ['code-review-flow'],
  input: selectBestMoveInputSchema
};

export const handler: StepHandler<typeof config> = async (input: SelectBestMoveInput, { emit, logger, state, traceId }) => {
  try {
    const { nodes, root_id, selection_mode = 'visits', output_url } = input;
    
    // Validate root node exists
    if (!nodes[root_id]) {
      logger.error('Root node not found in tree', { root_id });
      return;
    }
    
    const rootNode = nodes[root_id];
    const { children } = rootNode;
    
    // If root has no children, return the root node itself
    if (!children || children.length === 0) {
      logger.warn('Root node has no children to select from', { root_id });
      
      await emit({
        topic: 'code-review.reasoning.completed',
        data: {
          selected_node_id: root_id,
          state: rootNode.state || '',
          reasoning: 'No child nodes were generated from the root.',
          stats: {
            visits: rootNode.visits,
            value: rootNode.value,
            total_visits: rootNode.visits,
            children_count: 0
          },
          all_nodes: nodes,
          output_url: output_url
        }
      });
      
      return;
    }
    
    // Select the best node based on the selection mode
    let selected_node_id: string;
    let reasoning: string;
    
    switch (selection_mode) {
      case 'visits':
        selected_node_id = findNodeWithMostVisits(nodes, children);
        reasoning = `Selected based on number of visits: The node was visited ${nodes[selected_node_id].visits} times with a total value of ${nodes[selected_node_id].value.toFixed(2)}.`;
        break;
      case 'value':
        selected_node_id = findNodeWithHighestValue(nodes, children);
        reasoning = `Selected based on highest accumulated value: The node has a value of ${nodes[selected_node_id].value.toFixed(2)} after ${nodes[selected_node_id].visits} visits.`;
        break;
      case 'value-ratio':
        selected_node_id = findNodeWithBestValueRatio(nodes, children);
        reasoning = `Selected based on value/visits ratio: The node has a ratio of ${(nodes[selected_node_id].value / nodes[selected_node_id].visits).toFixed(2)} with ${nodes[selected_node_id].visits} visits and a value of ${nodes[selected_node_id].value.toFixed(2)}.`;
        break;
      default:
        selected_node_id = findNodeWithMostVisits(nodes, children);
        reasoning = `Selected based on default strategy (visits count): The node was visited ${nodes[selected_node_id].visits} times.`;
    }
    
    const selected_node = nodes[selected_node_id];
    if (!selected_node) {
      logger.error('Selected node not found in tree', { selected_node_id });
      return;
    }
    
    // Get total visit count
    const total_visits = getTotalVisits(nodes, root_id);
    
    logger.info('Best move selected', { 
      selected_node_id, 
      state: selected_node.state,
      mode: selection_mode,
      visits: selected_node.visits,
      value: selected_node.value,
      total_visits
    });
    
    // Emit the selected reasoning path
    await emit({
      topic: 'code-review.reasoning.completed',
      data: {
        selected_node_id,
        state: selected_node.state || '',
        reasoning,
        stats: {
          visits: selected_node.visits,
          value: selected_node.value,
          total_visits,
          children_count: children.length
        },
        all_nodes: nodes,
        output_url: output_url
      }
    });
  } catch (error) {
    // Create a safe error object without circular references
    const safeError = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown Error',
      stack: error instanceof Error ? error.stack : undefined
    };
    
    logger.error('Error selecting best move', safeError);
  }
};

// Helper functions for node selection
function findNodeWithMostVisits(nodes: Record<string, any>, childIds: string[]): string {
  let bestId = childIds[0];
  let mostVisits = nodes[bestId]?.visits || 0;
  
  for (const id of childIds) {
    const node = nodes[id];
    if (node && node.visits > mostVisits) {
      mostVisits = node.visits;
      bestId = id;
    }
  }
  
  return bestId;
}

function findNodeWithHighestValue(nodes: Record<string, any>, childIds: string[]): string {
  let bestId = childIds[0];
  let highestValue = nodes[bestId]?.value || 0;
  
  for (const id of childIds) {
    const node = nodes[id];
    if (node && node.value > highestValue) {
      highestValue = node.value;
      bestId = id;
    }
  }
  
  return bestId;
}

function findNodeWithBestValueRatio(nodes: Record<string, any>, childIds: string[]): string {
  let bestId = childIds[0];
  let bestRatio = 0;
  
  // Initialize with first node that has visits
  for (const id of childIds) {
    const node = nodes[id];
    if (node && node.visits > 0) {
      bestId = id;
      bestRatio = node.value / node.visits;
      break;
    }
  }
  
  // Find best ratio
  for (const id of childIds) {
    const node = nodes[id];
    if (node && node.visits > 0) {
      const ratio = node.value / node.visits;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestId = id;
      }
    }
  }
  
  return bestId;
}

// Calculate total visits for all nodes in the tree
function getTotalVisits(nodes: Record<string, any>, rootId: string): number {
  // In this implementation, we'll return the total visits of the root node,
  // which should be the sum of all visits in the proper MCTS implementation
  return nodes[rootId]?.visits || 0;
}