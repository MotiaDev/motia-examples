// 1. SelectNode activity
import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import { Node, nodeSchema } from '../shared/agents/claude';

const selectNodeInputSchema = z.object({
  nodes: z.record(z.string(), nodeSchema),
  rootId: z.string(),
  currentNodeId: z.string(),
  maxIterations: z.number(),
  currentIteration: z.number(),
  explorationConstant: z.number(),
  maxDepth: z.number()
});
export type SelectNodeInput = z.infer<typeof selectNodeInputSchema>;

export const config: EventConfig = {
  type: 'event',
  name: 'SelectNode',
  description: 'Selects a node in the MCTS tree using UCB1 formula',
  subscribes: ['mcts.iteration.started'],
  emits: ['mcts.node.selected'],
  flows: ['code-review-flow'],
  input: selectNodeInputSchema
};

export const handler: StepHandler<typeof config> = async (input: SelectNodeInput, { emit, logger, state, traceId }) => {
  try {
    const { nodes, rootId, currentNodeId, maxIterations, currentIteration, explorationConstant, maxDepth } = input;
    
    // Basic validation
    if (Object.keys(nodes).length === 0) {
      logger.error('No valid nodes available for selection');
      return;
    }
    
    // Select the best node according to UCB1 formula
    const selectedNode = await selectNodeUCB1(nodes, rootId, currentNodeId, explorationConstant, maxDepth);
    
    logger.info('Node selected', { 
      selectedNodeId: selectedNode.id,
      currentIteration,
      maxIterations
    });
    
    // Emit the selected node for the next step in MCTS
    await emit({
      topic: 'mcts.node.selected',
      data: { 
        nodes,
        rootId,
        selectedNodeId: selectedNode.id,
        maxIterations,
        currentIteration,
        explorationConstant,
        maxDepth
      }
    });
  } catch (error) {
    logger.error('Error selecting node', error);
  }
};

/**
 * Selects a node using the UCB1 formula, which balances exploration and exploitation
 * UCB1 = (node.value / node.visits) + explorationConstant * sqrt(ln(parentVisits) / node.visits)
 */
async function selectNodeUCB1(
  nodes: Record<string, Node>, 
  rootId: string, 
  currentNodeId: string, 
  explorationConstant: number,
  maxDepth: number,
  depth: number = 0
): Promise<Node> {
  // Starting from the current node
  let currentNode = nodes[currentNodeId];
  
  // If we reached a leaf node or maximum depth, return it
  if (currentNode.children.length === 0 || depth >= maxDepth) {
    return currentNode;
  }
  
  // Check if there are any unexplored children
  for (const childId of currentNode.children) {
    if (nodes[childId].visits === 0) {
      // Always choose unexplored nodes first
      return nodes[childId];
    }
  }
  
  // If all children have been explored, calculate UCB1 for each child
  let bestScore = -Infinity;
  let bestNodeId = '';
  
  for (const childId of currentNode.children) {
    const child = nodes[childId];
    
    // UCB1 formula components
    const exploitation = child.visits > 0 ? child.value / child.visits : 0;
    const exploration = explorationConstant * Math.sqrt(Math.log(Math.max(currentNode.visits, 1)) / Math.max(child.visits, 1));
    const score = exploitation + exploration;
    
    if (score > bestScore) {
      bestScore = score;
      bestNodeId = childId;
    }
  }
  
  // If we found a best child, continue traversing
  if (bestNodeId) {
    // Recursively select from the best child node
    return await selectNodeUCB1(nodes, rootId, bestNodeId, explorationConstant, maxDepth, depth + 1);
  }
  
  // Fallback to current node if no children are available
  return currentNode;
}