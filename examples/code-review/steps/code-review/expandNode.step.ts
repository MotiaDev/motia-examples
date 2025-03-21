// 2. ExpandNode activity
import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import { expandNode, nodeSchema } from '../shared/agents/claude';
import * as crypto from 'crypto';

const expandNodeInputSchema = z.object({
  nodes: z.record(z.string(), nodeSchema),
  rootId: z.string(),
  selectedNodeId: z.string(),
  maxIterations: z.number(),
  currentIteration: z.number(),
  explorationConstant: z.number(),
  maxDepth: z.number()
});

export type ExpandNodeInput = z.infer<typeof expandNodeInputSchema>;

export const config: EventConfig = {
  type: 'event',
  name: 'ExpandNode',
  description: 'Expands a selected node by generating possible reasoning steps',
  subscribes: ['mcts.node.selected'],
  emits: ['mcts.node.expanded'],
  flows: ['code-review-flow'],
  input: expandNodeInputSchema
};

export const handler: StepHandler<typeof config> = async (input: ExpandNodeInput, { emit, logger, state, traceId }) => {
  try {
    const { nodes, rootId, selectedNodeId } = input;
    
    // Validate the selected node exists
    if (!nodes[selectedNodeId]) {
      logger.error('Selected node not found in tree', { nodeId: selectedNodeId });
      return;
    }
    
    const selectedNode = nodes[selectedNodeId];
    
    // Get the node's state to expand
    const nodeState = selectedNode.state;
    if (!nodeState) {
      logger.error('Selected node has no state to expand', { nodeId: selectedNodeId });
      return;
    }
    
    // Generate possible reasoning steps using LLM
    logger.info('Expanding node', { nodeId: selectedNodeId });
    const expansion = await expandNode(nodeState);
    
    // Check if we have any steps to add
    if (!expansion.steps || expansion.steps.length === 0) {
      logger.warn('No expansion steps returned for node', { nodeId: selectedNodeId });
      return;
    }
    
    logger.info('Generated expansion', { 
      nodeId: selectedNodeId,
      stepCount: expansion.steps.length,
      reasoning: expansion.reasoning.substring(0, 100) + (expansion.reasoning.length > 100 ? '...' : '')
    });
    
    // Create new nodes for each expanded step
    const expandedNodeIds: string[] = [];
    
    // Initialize or get existing children array
    selectedNode.children = selectedNode.children || [];
    
    // Create a child node for each expansion step
    for (const step of expansion.steps) {
      const newNodeId = crypto.randomUUID();
      
      // Create the new node
      nodes[newNodeId] = {
        id: newNodeId,
        parent: selectedNodeId,
        children: [],
        visits: 0,
        value: 0,
        state: step,
        isTerminal: false
      };
      
      // Add the new node ID to the parent's children array
      selectedNode.children.push(newNodeId);
      
      // Add to our list of expanded nodes
      expandedNodeIds.push(newNodeId);
    }
    
    // Emit the expanded tree to the next step
    await emit({
      topic: 'mcts.node.expanded',
      data: { 
        nodes, 
        expandedNodeIds,
        rootId,
        maxIterations: input.maxIterations,
        currentIteration: input.currentIteration,
        explorationConstant: input.explorationConstant,
        maxDepth: input.maxDepth
      }
    });
    
  } catch (error) {
    logger.error('Error expanding node', error);
  }
};
