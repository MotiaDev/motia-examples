// 3. Simulate activity
import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import { nodeSchema, evaluateReasoning, SimulationResult } from '../shared/agents/claude';

const simulateInputSchema = z.object({
  nodes: z.record(z.string(), nodeSchema),
  rootId: z.string(),
  expandedNodeIds: z.array(z.string()),
  maxIterations: z.number(),
  currentIteration: z.number(),
  explorationConstant: z.number(),
  maxDepth: z.number()
});

export type SimulateInput = z.infer<typeof simulateInputSchema>;

export const config: EventConfig = {
  type: 'event',
  name: 'Simulate',
  description: 'Simulates reasoning path outcome using LLM evaluation',
  subscribes: ['mcts.node.expanded'],
  emits: ['mcts.simulation.completed'],
  flows: ['code-review-flow'],
  input: simulateInputSchema
};

export const handler: StepHandler<typeof config> = async (input: SimulateInput, { emit, logger, state, traceId }) => {
  try {
    const { nodes, rootId, expandedNodeIds, maxIterations, currentIteration, explorationConstant, maxDepth } = input;
    
    // Validate the root node exists
    if (!nodes[rootId]) {
      logger.error('Root node not found in tree', { rootId });
      return;
    }
    
    // Validate there are expanded nodes to simulate
    if (!expandedNodeIds || expandedNodeIds.length === 0) {
      logger.warn('No expanded nodes to simulate', { rootId });
      return;
    }
    
    // Validate that all expanded nodes exist in the tree
    for (const nodeId of expandedNodeIds) {
      if (!nodes[nodeId]) {
        logger.error('Node not found in tree', { nodeId });
        return;
      }
    }
    
    // Get the root node state
    const rootState = nodes[rootId].state;
    if (!rootState) {
      logger.error('Root node has no state for simulation context', { rootId });
      return;
    }
    
    // Get the states of expanded nodes
    const expandedStates = expandedNodeIds.map(id => {
      const state = nodes[id].state;
      if (!state) {
        logger.warn('Expanded node has no state', { nodeId: id });
        return '';
      }
      return state;
    }).filter(Boolean);
    
    if (expandedStates.length === 0) {
      logger.warn('No valid expanded states for simulation', { rootId });
      return;
    }
    
    // Perform simulation by evaluating the reasoning paths
    logger.info('Simulating outcomes for expanded nodes', { 
      rootId,
      expandedNodeCount: expandedNodeIds.length,
      currentIteration,
      maxIterations
    });
    
    // Use Claude to evaluate the reasoning paths and assign a value
    const simulationResult = await evaluateReasoning(rootState, expandedStates, expandedNodeIds);
    
    logger.info('Simulation completed', {
      selectedNodeId: simulationResult.nodeId,
      value: simulationResult.value
    });
    
    // Emit the simulation result for backpropagation
    await emit({
      topic: 'mcts.simulation.completed',
      data: {
        nodes,
        rootId,
        simulationResult,
        maxIterations,
        currentIteration,
        explorationConstant,
        maxDepth
      }
    });
  } catch (error) {
    logger.error('Error simulating node outcomes', error);
  }
};
