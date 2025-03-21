import { handler, config, SelectNodeInput } from './selectNode.step';

// Create mock context
const createTestContext = () => ({
  emit: jest.fn(),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  state: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn()
  },
  traceId: 'test-trace-id'
});

// Create mock node tree for MCTS
const createMockNodeTree = () => {
  // Create a simple tree with root and a few children
  const nodes: Record<string, any> = {
    'root': {
      id: 'root',
      parent: null,
      children: ['child1', 'child2', 'child3'],
      visits: 10,
      value: 5,
      state: 'Initial state description'
    },
    'child1': {
      id: 'child1',
      parent: 'root',
      children: [],
      visits: 5,
      value: 3,
      state: 'Child 1 state description'
    },
    'child2': {
      id: 'child2',
      parent: 'root',
      children: [],
      visits: 3,
      value: 4,
      state: 'Child 2 state description'
    },
    'child3': {
      id: 'child3',
      parent: 'root',
      children: [],
      visits: 2,
      value: 1,
      state: 'Child 3 state description'
    }
  };
  
  return nodes;
};

// Sample input data for selectNode
const createSampleInput = (nodeId: string = 'root'): SelectNodeInput => ({
  nodes: createMockNodeTree(),
  rootId: 'root',
  currentNodeId: nodeId,
  maxIterations: 100,
  currentIteration: 1,
  explorationConstant: 1.414,
  maxDepth: 10
});

describe('SelectNode Step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have proper configuration', () => {
    // Test the step configuration
    expect(config.type).toBe('event');
    expect(config.name).toBe('SelectNode');
    expect(config.subscribes).toContain('mcts.iteration.started');
    expect(config.emits).toContain('mcts.node.selected');
    expect(config.flows).toContain('code-review-flow');
  });

  it('should emit mcts.node.selected event with correct data', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.emit).toHaveBeenCalledWith({
      topic: 'mcts.node.selected',
      data: expect.objectContaining({
        nodes: input.nodes,
        rootId: input.rootId,
        selectedNodeId: expect.any(String), // We don't know exactly which node will be selected
        maxIterations: input.maxIterations,
        currentIteration: input.currentIteration,
        explorationConstant: input.explorationConstant,
        maxDepth: input.maxDepth
      })
    });
    
    // Verify the emit was called and got a log message
    expect(context.logger.info).toHaveBeenCalledWith('Node selected', expect.any(Object));
  });

  it('should handle selection with empty nodes', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    input.nodes = {}; // Empty nodes object
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.logger.error).toHaveBeenCalledWith('No valid nodes available for selection');
    expect(context.emit).not.toHaveBeenCalled();
  });

  it('should select a node with highest UCB1 score', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    
    // Modify the node values to make child2 have the highest UCB1 score
    input.nodes.child2.value = 10; // High value for exploitation
    
    // Act
    await handler(input, context as any);
    
    // Assert
    const emitCall = context.emit.mock.calls[0][0];
    expect(emitCall.data.selectedNodeId).toBe('child2');
  });

  it('should select unexplored nodes for exploration', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    
    // Add an unexplored node
    input.nodes.child4 = {
      id: 'child4',
      parent: 'root',
      children: [],
      visits: 0, // Never visited
      value: 0,
      state: 'Child 4 state description'
    };
    input.nodes.root.children.push('child4');
    
    // Act
    await handler(input, context as any);
    
    // Assert
    const emitCall = context.emit.mock.calls[0][0];
    expect(emitCall.data.selectedNodeId).toBe('child4'); // Should prefer unexplored node
  });
}); 