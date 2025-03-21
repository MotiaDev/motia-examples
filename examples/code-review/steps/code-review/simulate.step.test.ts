import { handler, config, SimulateInput } from './simulate.step';
import * as process from 'process';

// Determine if we should use mocks
const shouldMock = process.env.MOCK_CLAUDE === 'true';

// Always mock Claude when running tests to avoid network calls
jest.mock('../shared/agents/claude', () => {
  // Create a base mock object with the real function signatures
  const claudeMock = {
    evaluateReasoning: jest.fn().mockImplementation(async (parentState, expandedStates) => {
      // Return a mock evaluation result with scores
      return {
        nodeId: expandedStates[0] || 'root',
        value: 0.8, // Mock high value
        explanation: 'Mock explanation for evaluation'
      };
    })
  };
  
  // Re-export original module exports to maintain API
  const originalModule = jest.requireActual('../shared/agents/claude');
  return {
    ...originalModule,
    // Override specific functions with our mocks
    evaluateReasoning: claudeMock.evaluateReasoning
  };
});

// Import after mocking
import * as claude from '../shared/agents/claude';

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
      children: ['expanded-1', 'expanded-2'],
      visits: 5,
      value: 3,
      state: 'Root reasoning state',
      isTerminal: false
    },
    'expanded-1': {
      id: 'expanded-1',
      parent: 'root',
      children: [],
      visits: 0,
      value: 0,
      state: 'First expanded reasoning state',
      isTerminal: false
    },
    'expanded-2': {
      id: 'expanded-2',
      parent: 'root',
      children: [],
      visits: 0,
      value: 0,
      state: 'Second expanded reasoning state',
      isTerminal: false
    }
  };
  
  return nodes;
};

// Sample input data for simulation
const createSampleInput = (): SimulateInput => ({
  nodes: createMockNodeTree(),
  rootId: 'root',
  expandedNodeIds: ['expanded-1', 'expanded-2'],
  maxIterations: 100,
  currentIteration: 1,
  explorationConstant: 1.414,
  maxDepth: 10
});

describe('Simulate Step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have proper configuration', () => {
    // Test the step configuration
    expect(config.type).toBe('event');
    expect(config.name).toBe('Simulate');
    expect(config.subscribes).toContain('mcts.node.expanded');
    expect(config.emits).toContain('mcts.simulation.completed');
    expect(config.flows).toContain('code-review-flow');
  });

  // Run the tests that require Claude conditionally
  if (shouldMock) {
    it('should call evaluateReasoning with the parent state and expanded states', async () => {
      // Arrange
      const context = createTestContext();
      const input = createSampleInput();
      
      // Act
      await handler(input, context as any);
      
      // Assert
      expect(claude.evaluateReasoning).toHaveBeenCalledWith(
        input.nodes[input.rootId].state,
        input.expandedNodeIds.map(id => input.nodes[id].state)
      );
    });

    it('should emit simulation.completed event with simulation result', async () => {
      // Arrange
      const context = createTestContext();
      const input = createSampleInput();
      
      // Act
      await handler(input, context as any);
      
      // Assert
      expect(context.emit).toHaveBeenCalled();
      
      const emitCall = context.emit.mock.calls[0][0];
      expect(emitCall.topic).toBe('mcts.simulation.completed');
      expect(emitCall.data).toMatchObject({
        nodes: input.nodes,
        rootId: input.rootId,
        simulationResult: expect.objectContaining({
          nodeId: expect.any(String),
          value: expect.any(Number)
        }),
        maxIterations: input.maxIterations,
        currentIteration: input.currentIteration,
        explorationConstant: input.explorationConstant,
        maxDepth: input.maxDepth
      });
    });

    it('should handle errors during simulation', async () => {
      // Arrange
      const context = createTestContext();
      const input = createSampleInput();
      
      // Force an error during evaluation
      (claude.evaluateReasoning as jest.Mock).mockRejectedValueOnce(new Error('Simulation failed'));
      
      // Act
      await handler(input, context as any);
      
      // Assert
      expect(context.logger.error).toHaveBeenCalled();
      expect(context.emit).not.toHaveBeenCalled();
    });
  } else {
    // When not mocking, warn about needing to set MOCK_CLAUDE
    it('skips tests requiring Claude access when MOCK_CLAUDE=true is not set', () => {
      console.warn('⚠️ Skipping simulate step tests that require Claude CLI access.');
      console.warn('Set MOCK_CLAUDE=true to run these tests with mocked Claude responses.');
    });
  }

  // These tests don't require Claude calls
  it('should handle empty expanded nodes array', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    input.expandedNodeIds = [];
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.logger.warn).toHaveBeenCalledWith('No expanded nodes to simulate', expect.any(Object));
    expect(context.emit).not.toHaveBeenCalled();
  });

  it('should handle missing nodes', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    input.expandedNodeIds = ['non-existent-node'];
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.logger.error).toHaveBeenCalledWith('Node not found in tree', expect.any(Object));
    expect(context.emit).not.toHaveBeenCalled();
  });
}); 