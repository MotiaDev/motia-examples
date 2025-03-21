import { handler, config, SelectBestMoveInput } from './selectBestMove.step';

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

// Create a basic node tree for MCTS with various scores and visits
const createMockNodeTree = () => {
  const nodes: Record<string, any> = {
    'root': {
      id: 'root',
      parent: null,
      children: ['node1', 'node2', 'node3'],
      visits: 50,
      value: 25,
      state: 'Root reasoning state',
      isTerminal: false
    },
    'node1': {
      id: 'node1',
      parent: 'root',
      children: [],
      visits: 20,
      value: 15,
      state: 'This is the most visited child node with good value/visit ratio',
      isTerminal: false
    },
    'node2': {
      id: 'node2',
      parent: 'root',
      children: [],
      visits: 15,
      value: 8,
      state: 'This node has medium visits but lower value/visit ratio',
      isTerminal: false
    },
    'node3': {
      id: 'node3',
      parent: 'root',
      children: [],
      visits: 5,
      value: 2,
      state: 'This node has few visits and low value',
      isTerminal: false
    }
  };
  
  return nodes;
};

// Sample input data for selectBestMove
const createSampleInput = (): SelectBestMoveInput => ({
  nodes: createMockNodeTree(),
  rootId: 'root',
  currentIteration: 50,
  maxIterations: 50,
  explorationConstant: 1.414,
  maxDepth: 10,
  isComplete: true,
  selectionMode: 'visits' // Default selection mode
});

describe('SelectBestMove Step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have proper configuration', () => {
    // Test the step configuration
    expect(config.type).toBe('event');
    expect(config.name).toBe('SelectBestMove');
    expect(config.subscribes).toContain('mcts.iterations.completed');
    expect(config.emits).toContain('code-review.reasoning.completed');
    expect(config.flows).toContain('code-review-flow');
  });

  it('should select the child node with the highest visit count', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.emit).toHaveBeenCalled();
    const emitCall = context.emit.mock.calls[0][0];
    expect(emitCall.topic).toBe('code-review.reasoning.completed');
    
    // The node with the highest visit count should be selected (node1)
    expect(emitCall.data.selectedNodeId).toBe('node1');
    expect(emitCall.data.state).toBe(input.nodes['node1'].state);
  });

  it('should select the child node with the highest value if visit counts are equal', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    input.selectionMode = 'value'; // Change selection mode to value
    
    // Make all nodes have equal visits but different values
    input.nodes['node1'].visits = 10;
    input.nodes['node2'].visits = 10;
    input.nodes['node3'].visits = 10;
    input.nodes['node1'].value = 5;
    input.nodes['node2'].value = 8; // This one has the highest value
    input.nodes['node3'].value = 3;
    
    // Act
    await handler(input, context as any);
    
    // Assert
    const emitCall = context.emit.mock.calls[0][0];
    expect(emitCall.data.selectedNodeId).toBe('node2');
    expect(emitCall.data.state).toBe(input.nodes['node2'].state);
  });

  it('should select the child with the best value/visit ratio if specified in the selection mode', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    input.selectionMode = 'value-ratio'; // Select by value/visit ratio
    
    // Set up nodes with different value/visit ratios
    input.nodes['node1'].visits = 10;
    input.nodes['node1'].value = 5; // Ratio: 0.5
    input.nodes['node2'].visits = 10; 
    input.nodes['node2'].value = 8; // Ratio: 0.8 (highest)
    input.nodes['node3'].visits = 10;
    input.nodes['node3'].value = 3; // Ratio: 0.3
    
    // Act
    await handler(input, context as any);
    
    // Assert
    const emitCall = context.emit.mock.calls[0][0];
    expect(emitCall.data.selectedNodeId).toBe('node2');
  });

  it('should handle the case with no children', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    input.nodes['root'].children = [];
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.logger.warn).toHaveBeenCalledWith('Root node has no children to select from', expect.any(Object));
    expect(context.emit).toHaveBeenCalled();
    const emitCall = context.emit.mock.calls[0][0];
    expect(emitCall.data.selectedNodeId).toBe('root');
    expect(emitCall.data.state).toBe(input.nodes['root'].state);
  });

  it('should select the first child if all children have equal visits and values', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    
    // Make all child nodes have equal stats
    const equalValue = 5;
    const equalVisits = 10;
    input.nodes['node1'].visits = equalVisits;
    input.nodes['node2'].visits = equalVisits;
    input.nodes['node3'].visits = equalVisits;
    input.nodes['node1'].value = equalValue;
    input.nodes['node2'].value = equalValue;
    input.nodes['node3'].value = equalValue;
    
    // Act
    await handler(input, context as any);
    
    // Assert
    const emitCall = context.emit.mock.calls[0][0];
    expect(emitCall.data.selectedNodeId).toBe('node1'); // First child
  });

  it('should provide detailed reasoning for the selected node', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    
    // Act
    await handler(input, context as any);
    
    // Assert
    const emitCall = context.emit.mock.calls[0][0];
    expect(emitCall.data).toMatchObject({
      selectedNodeId: 'node1',
      state: input.nodes['node1'].state,
      reasoning: expect.any(String), // Just check that reasoning is a string
      stats: expect.objectContaining({
        visits: input.nodes['node1'].visits,
        value: input.nodes['node1'].value,
        totalVisits: input.nodes['root'].visits,
        childrenCount: input.nodes['root'].children.length
      })
    });
  });

  it('should handle errors during the selection process', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    
    // Cause an error by making the root node non-existent
    input.rootId = 'non-existent-node';
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.logger.error).toHaveBeenCalled();
    expect(context.emit).not.toHaveBeenCalled();
  });

  it('should include all analyzed nodes in the output', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    
    // Act
    await handler(input, context as any);
    
    // Assert
    const emitCall = context.emit.mock.calls[0][0];
    expect(emitCall.data.allNodes).toEqual(expect.objectContaining({
      'node1': expect.objectContaining({
        visits: input.nodes['node1'].visits,
        value: input.nodes['node1'].value,
      }),
      'node2': expect.objectContaining({
        visits: input.nodes['node2'].visits,
        value: input.nodes['node2'].value,
      }),
      'node3': expect.objectContaining({
        visits: input.nodes['node3'].visits,
        value: input.nodes['node3'].value,
      })
    }));
  });
}); 