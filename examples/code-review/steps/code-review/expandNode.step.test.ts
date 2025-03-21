import { handler, config, ExpandNodeInput } from './expandNode.step';
import * as claude from '../shared/agents/claude';
import * as crypto from 'crypto';

// Create a UUID generator with deterministic sequence for testing
let mockUuidCounter = 0;
const mockUuids = [
  'expansion-child-1',
  'expansion-child-2',
  'expansion-child-3',
  'expansion-child-4',
];

// Mock crypto.randomUUID
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockImplementation(() => {
    return mockUuids[mockUuidCounter++ % mockUuids.length];
  })
}));

// Mock the claude agent
jest.mock('../shared/agents/claude', () => ({
  expandNode: jest.fn()
}));

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
      children: ['node1'],
      visits: 5,
      value: 3,
      state: 'Root reasoning state',
      isTerminal: false
    },
    'node1': {
      id: 'node1',
      parent: 'root',
      children: [],
      visits: 1,
      value: 0.5,
      state: 'Selected node reasoning state',
      isTerminal: false
    }
  };
  
  return nodes;
};

// Sample input data for expandNode
const createSampleInput = (): ExpandNodeInput => ({
  nodes: createMockNodeTree(),
  rootId: 'root',
  selectedNodeId: 'node1',
  maxIterations: 100,
  currentIteration: 1,
  explorationConstant: 1.414,
  maxDepth: 10
});

describe('ExpandNode Step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUuidCounter = 0; // Reset counter for each test
  });

  it('should have proper configuration', () => {
    // Test the step configuration
    expect(config.type).toBe('event');
    expect(config.name).toBe('ExpandNode');
    expect(config.subscribes).toContain('mcts.node.selected');
    expect(config.emits).toContain('mcts.node.expanded');
    expect(config.flows).toContain('code-review-flow');
  });

  it('should call claude.expandNode with the selected node state', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    const mockExpansion = {
      reasoning: 'Expansion reasoning',
      steps: ['Step 1', 'Step 2', 'Step 3']
    };
    
    // Setup mock implementation
    (claude.expandNode as jest.Mock).mockResolvedValue(mockExpansion);
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(claude.expandNode).toHaveBeenCalledWith(input.nodes[input.selectedNodeId].state);
  });

  it('should create new nodes for each expansion step', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    const mockExpansion = {
      reasoning: 'Expansion reasoning',
      steps: ['Step 1', 'Step 2', 'Step 3']
    };
    
    // Setup mock implementation
    (claude.expandNode as jest.Mock).mockResolvedValue(mockExpansion);
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.emit).toHaveBeenCalled();
    
    const emitCall = context.emit.mock.calls[0][0];
    expect(emitCall.topic).toBe('mcts.node.expanded');
    expect(emitCall.data.nodes[mockUuids[0]]).toBeDefined();
    expect(emitCall.data.nodes[mockUuids[1]]).toBeDefined();
    expect(emitCall.data.nodes[mockUuids[2]]).toBeDefined();
    
    // Check that the expanded nodes have the correct structure
    const firstExpandedNode = emitCall.data.nodes[mockUuids[0]];
    expect(firstExpandedNode.parent).toBe(input.selectedNodeId);
    expect(firstExpandedNode.children).toEqual([]);
    expect(firstExpandedNode.visits).toBe(0);
    expect(firstExpandedNode.value).toBe(0);
    expect(firstExpandedNode.state).toBe('Step 1');
  });

  it('should update the selected node children array', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    const mockExpansion = {
      reasoning: 'Expansion reasoning',
      steps: ['Step 1', 'Step 2']
    };
    
    // Setup mock implementation
    (claude.expandNode as jest.Mock).mockResolvedValue(mockExpansion);
    
    // Act
    await handler(input, context as any);
    
    // Assert
    const emitCall = context.emit.mock.calls[0][0];
    
    // First two UUIDs should be in the children array
    expect(emitCall.data.nodes[input.selectedNodeId].children).toContain(mockUuids[0]);
    expect(emitCall.data.nodes[input.selectedNodeId].children).toContain(mockUuids[1]);
    expect(emitCall.data.nodes[input.selectedNodeId].children.length).toBe(2);
  });

  it('should emit the expanded nodes array in the event data', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    const mockExpansion = {
      reasoning: 'Expansion reasoning',
      steps: ['Step 1', 'Step 2']
    };
    
    // Setup mock implementation
    (claude.expandNode as jest.Mock).mockResolvedValue(mockExpansion);
    
    // Act
    await handler(input, context as any);
    
    // Assert
    const emitCall = context.emit.mock.calls[0][0];
    expect(emitCall.data.expandedNodeIds).toEqual([mockUuids[0], mockUuids[1]]);
  });

  it('should handle errors during node expansion', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    const error = new Error('Expansion failed');
    
    // Setup mock implementation to throw error
    (claude.expandNode as jest.Mock).mockRejectedValue(error);
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.logger.error).toHaveBeenCalledWith('Error expanding node', error);
    expect(context.emit).not.toHaveBeenCalled();
  });

  it('should handle the case when no steps are returned', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    const mockExpansion = {
      reasoning: 'Expansion reasoning',
      steps: [] // Empty steps array
    };
    
    // Setup mock implementation
    (claude.expandNode as jest.Mock).mockResolvedValue(mockExpansion);
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.logger.warn).toHaveBeenCalledWith('No expansion steps returned for node', {
      nodeId: input.selectedNodeId
    });
    expect(context.emit).not.toHaveBeenCalled();
  });

  it('should handle the case when the selected node does not exist', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    input.selectedNodeId = 'non-existent-node';
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.logger.error).toHaveBeenCalledWith('Selected node not found in tree', {
      nodeId: 'non-existent-node'
    });
    expect(context.emit).not.toHaveBeenCalled();
  });
}); 