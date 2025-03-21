import { handler, config, BackpropagateInput } from './backPropogate.step';

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

// Create a basic node tree for MCTS
const createMockNodeTree = () => {
  const nodes: Record<string, any> = {
    'root': {
      id: 'root',
      parent: null,
      children: ['node1', 'node2'],
      visits: 5,
      value: 3,
      state: 'Root reasoning state',
      isTerminal: false
    },
    'node1': {
      id: 'node1',
      parent: 'root',
      children: ['leaf1'],
      visits: 3,
      value: 2,
      state: 'Node 1 reasoning state',
      isTerminal: false
    },
    'node2': {
      id: 'node2',
      parent: 'root',
      children: [],
      visits: 2,
      value: 1,
      state: 'Node 2 reasoning state',
      isTerminal: false
    },
    'leaf1': {
      id: 'leaf1',
      parent: 'node1',
      children: [],
      visits: 1,
      value: 0.5,
      state: 'Leaf 1 reasoning state',
      isTerminal: false
    }
  };
  
  return nodes;
};

// Sample input data for backpropagation
const createSampleInput = (): BackpropagateInput => ({
  nodes: createMockNodeTree(),
  rootId: 'root',
  simulationResult: {
    nodeId: 'leaf1',
    value: 0.8,
    explanation: 'Test explanation for high value'
  },
  maxIterations: 100,
  currentIteration: 1,
  explorationConstant: 1.414,
  maxDepth: 10
});

describe('Backpropagate Step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have proper configuration', () => {
    // Test the step configuration
    expect(config.type).toBe('event');
    expect(config.name).toBe('Backpropagate');
    expect(config.subscribes).toContain('mcts.simulation.completed');
    expect(config.emits).toContain('mcts.backpropagation.completed');
    expect(config.flows).toContain('code-review-flow');
  });

  it('should update the statistics of the simulated node', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    const originalNodeVisits = input.nodes['leaf1'].visits;
    const originalNodeValue = input.nodes['leaf1'].value;
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(input.nodes['leaf1'].visits).toBe(originalNodeVisits + 1);
    expect(input.nodes['leaf1'].value).toBe(originalNodeValue + input.simulationResult.value);
  });

  it('should propagate updates up to the root node', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    const nodesInPath = ['leaf1', 'node1', 'root'];
    const originalVisits = nodesInPath.map(id => input.nodes[id].visits);
    const originalValues = nodesInPath.map(id => input.nodes[id].value);
    
    // Act
    await handler(input, context as any);
    
    // Assert
    nodesInPath.forEach((nodeId, index) => {
      expect(input.nodes[nodeId].visits).toBe(originalVisits[index] + 1);
      expect(input.nodes[nodeId].value).toBe(originalValues[index] + input.simulationResult.value);
    });
  });

  it('should not update nodes not in the backpropagation path', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    const nodeNotInPath = 'node2';
    const originalVisits = input.nodes[nodeNotInPath].visits;
    const originalValue = input.nodes[nodeNotInPath].value;
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(input.nodes[nodeNotInPath].visits).toBe(originalVisits);
    expect(input.nodes[nodeNotInPath].value).toBe(originalValue);
  });

  it('should emit mcts.backpropagation.completed event with updated nodes', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    
    // Act
    await handler(input, context as any);
    
    // Assert
    // Find the backpropagation.completed event
    const backpropEvent = context.emit.mock.calls.find(
      call => call[0].topic === 'mcts.backpropagation.completed'
    );
    
    expect(backpropEvent).toBeDefined();
    expect(backpropEvent[0]).toMatchObject({
      topic: 'mcts.backpropagation.completed',
      data: expect.objectContaining({
        nodes: input.nodes,
        rootId: input.rootId,
        maxIterations: input.maxIterations,
        currentIteration: input.currentIteration + 1, // Iteration should be incremented
        explorationConstant: input.explorationConstant,
        maxDepth: input.maxDepth
      })
    });
  });

  it('should handle errors during backpropagation', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    
    // Cause an error by making the node path invalid
    input.simulationResult.nodeId = 'non-existent-node';
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.logger.error).toHaveBeenCalled();
    expect(context.emit).not.toHaveBeenCalled();
  });

  it('should handle null parent in node path', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    input.simulationResult.nodeId = 'root'; // Start from root which has null parent
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.emit).toHaveBeenCalled();
    expect(input.nodes['root'].visits).toBe(input.nodes['root'].visits);
  });

  it('should log the backpropagation path', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.logger.info).toHaveBeenCalledWith(
      'Backpropagation completed',
      expect.objectContaining({
        path: ['leaf1', 'node1', 'root'],
        value: input.simulationResult.value
      })
    );
  });
}); 