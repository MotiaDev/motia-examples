// 5. SelectBestMove activity
import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import { nodeSchema } from '../shared/agents/claude';

// Define the selection mode options
export type SelectionMode = 'visits' | 'value' | 'value-ratio';

const selectBestMoveInputSchema = z.object({
  nodes: z.record(z.string(), nodeSchema),
  rootId: z.string(),
  currentIteration: z.number(),
  maxIterations: z.number(),
  explorationConstant: z.number(),
  maxDepth: z.number(),
  isComplete: z.boolean().optional().default(false),
  selectionMode: z.enum(['visits', 'value', 'value-ratio']).optional().default('visits'),
  outputPath: z.string().optional()
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
    const { nodes, rootId, selectionMode = 'visits', outputPath } = input;
    
    // Validate root node exists
    if (!nodes[rootId]) {
      logger.error('Root node not found in tree', { rootId });
      return;
    }
    
    const rootNode = nodes[rootId];
    const { children } = rootNode;
    
    // If root has no children, return the root node itself
    if (!children || children.length === 0) {
      logger.warn('Root node has no children to select from', { rootId });
      
      await emit({
        topic: 'code-review.reasoning.completed',
        data: {
          selectedNodeId: rootId,
          state: rootNode.state || '',
          reasoning: 'No child nodes were generated from the root.',
          stats: {
            visits: rootNode.visits,
            value: rootNode.value,
            totalVisits: rootNode.visits,
            childrenCount: 0
          },
          allNodes: nodes,
          outputPath
        }
      });
      
      return;
    }
    
    // Select the best node based on the selection mode
    let selectedNodeId: string;
    let reasoning: string;
    
    switch (selectionMode) {
      case 'visits':
        selectedNodeId = findNodeWithMostVisits(nodes, children);
        reasoning = `Selected based on number of visits: The node was visited ${nodes[selectedNodeId].visits} times with a total value of ${nodes[selectedNodeId].value.toFixed(2)}.`;
        break;
      case 'value':
        selectedNodeId = findNodeWithHighestValue(nodes, children);
        reasoning = `Selected based on highest accumulated value: The node has a value of ${nodes[selectedNodeId].value.toFixed(2)} after ${nodes[selectedNodeId].visits} visits.`;
        break;
      case 'value-ratio':
        selectedNodeId = findNodeWithBestValueRatio(nodes, children);
        reasoning = `Selected based on value/visits ratio: The node has a ratio of ${(nodes[selectedNodeId].value / nodes[selectedNodeId].visits).toFixed(2)} with ${nodes[selectedNodeId].visits} visits and a value of ${nodes[selectedNodeId].value.toFixed(2)}.`;
        break;
      default:
        selectedNodeId = findNodeWithMostVisits(nodes, children);
        reasoning = `Selected based on default strategy (visits count): The node was visited ${nodes[selectedNodeId].visits} times.`;
    }
    
    const selectedNode = nodes[selectedNodeId];
    if (!selectedNode) {
      logger.error('Selected node not found in tree', { selectedNodeId });
      return;
    }
    
    // Get total visit count
    const totalVisits = getTotalVisits(nodes, rootId);
    
    logger.info('Best move selected', { 
      selectedNodeId, 
      state: selectedNode.state,
      mode: selectionMode,
      visits: selectedNode.visits,
      value: selectedNode.value,
      totalVisits
    });
    
    // Emit the selected reasoning path
    await emit({
      topic: 'code-review.reasoning.completed',
      data: {
        selectedNodeId,
        state: selectedNode.state || '',
        reasoning,
        stats: {
          visits: selectedNode.visits,
          value: selectedNode.value,
          totalVisits,
          childrenCount: children.length
        },
        allNodes: nodes,
        outputPath
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