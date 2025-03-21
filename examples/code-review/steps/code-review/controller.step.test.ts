import { Commits } from '../shared/utils/repository';
import { evaluateCommits } from '../shared/agents/claude';
import { handler, config, MCTSControllerInput } from './controller.step';

// Mock repository module
jest.mock('../shared/utils/repository', () => ({
  Commits: {
    create: jest.fn()
  }
}));

// Mock claude agent
jest.mock('../shared/agents/claude', () => ({
  evaluateCommits: jest.fn()
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

// Create mock commits
const createMockCommits = () => ({
  repoUrl: 'https://github.com/test/repo',
  branch: 'main',
  reviewStartCommit: 'abc123',
  reviewEndCommit: 'def456',
  diff: 'mock diff content',
  messages: 'commit abc123 Fix bug\ncommit def456 Add feature',
  files: 'src/main.ts\nsrc/utils.ts',
  history: {
    diff: 'mock diff content',
    messages: 'commit messages',
    files: 'changed files'
  },
  git: {
    getDiff: jest.fn(),
    getMessages: jest.fn(),
    resolveCommit: jest.fn(),
    getFiles: jest.fn()
  }
});

// Create mock evaluation
const createMockEvaluation = (score: number = 0.7) => ({
  score,
  issues: [{ 
    claim: 'Test claim', 
    grounds: 'Test grounds', 
    warrant: 'Test warrant', 
    backing: 'Test backing', 
    qualifier: 'Test qualifier'
  }],
  summary: 'Test summary of the evaluation',
  issueSummary: 'Test issue summary'
});

// Sample input data
const sampleInput: MCTSControllerInput = {
  prompt: 'Evaluate code for best practices',
  repoUrl: 'https://github.com/test/repo',
  branch: 'main',
  maxIterations: 100,
  explorationConstant: 1.414,
  maxDepth: 10,
  reviewStartCommit: 'abc123',
  reviewEndCommit: 'def456',
  requirements: 'The code should follow best practices and be well-documented'
};

describe('MCTS Controller Step', () => {
  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have proper configuration', () => {
    expect(config.type).toBe('event');
    expect(config.name).toBe('MCTSController');
    expect(config.subscribes).toContain('review.requested');
    expect(config.subscribes).toContain('mcts.backpropagation.completed');
    expect(config.emits).toContain('mcts.iteration.started');
    expect(config.emits).toContain('mcts.iterations.completed');
    expect(config.flows).toContain('code-review-flow');
  });

  it('should start a new iteration when evaluation score is low', async () => {
    // Arrange
    const context = createTestContext();
    const mockCommits = createMockCommits();
    const mockEvaluation = createMockEvaluation(0.5); // Score below threshold
    
    // Setup mocks
    (Commits.create as jest.Mock).mockResolvedValue(mockCommits);
    (evaluateCommits as jest.Mock).mockResolvedValue(mockEvaluation);
    
    // Act
    await handler(sampleInput, context as any);
    
    // Assert
    expect(Commits.create).toHaveBeenCalledWith('test-trace-id', context.state, sampleInput);
    expect(evaluateCommits).toHaveBeenCalledWith(mockCommits, sampleInput.prompt);
    expect(context.logger.info).toHaveBeenCalledWith('Analyzing review context', expect.any(Object));
    
    // Check that an event was emitted with the right topic
    expect(context.emit).toHaveBeenCalledWith(expect.objectContaining({
      topic: 'mcts.iteration.started'
    }));
    
    // Check the data contains the expected properties
    const emitData = context.emit.mock.calls[0][0].data;
    expect(emitData).toHaveProperty('nodes');
    expect(emitData).toHaveProperty('rootId');
    expect(emitData).toHaveProperty('currentNodeId');
    expect(emitData).toHaveProperty('currentIteration', 0);
    expect(emitData).toHaveProperty('maxIterations', 100);
  });

  it('should complete iterations when evaluation score is high', async () => {
    // Arrange
    const context = createTestContext();
    const mockCommits = createMockCommits();
    const mockEvaluation = createMockEvaluation(0.95); // Score above threshold
    
    // Setup mocks
    (Commits.create as jest.Mock).mockResolvedValue(mockCommits);
    (evaluateCommits as jest.Mock).mockResolvedValue(mockEvaluation);
    
    // Act
    await handler(sampleInput, context as any);
    
    // Assert
    expect(Commits.create).toHaveBeenCalledWith('test-trace-id', context.state, sampleInput);
    expect(evaluateCommits).toHaveBeenCalledWith(mockCommits, sampleInput.prompt);
    
    // Check that an event was emitted with the right topic
    expect(context.emit).toHaveBeenCalledWith(expect.objectContaining({
      topic: 'mcts.iterations.completed'
    }));
    
    // Check the data contains the expected properties
    const emitData = context.emit.mock.calls[0][0].data;
    expect(emitData).toHaveProperty('nodes');
    expect(emitData).toHaveProperty('rootId');
    expect(emitData).toHaveProperty('currentIteration', 0);
    expect(emitData).toHaveProperty('maxIterations', 100);
  });

  it('should complete iterations when maxIterations is 0', async () => {
    // Arrange
    const context = createTestContext();
    const mockCommits = createMockCommits();
    const mockEvaluation = createMockEvaluation(0.5); // Low score
    const zeroIterationsInput = { ...sampleInput, maxIterations: 0 };
    
    // Setup mocks
    (Commits.create as jest.Mock).mockResolvedValue(mockCommits);
    (evaluateCommits as jest.Mock).mockResolvedValue(mockEvaluation);
    
    // Act
    await handler(zeroIterationsInput, context as any);
    
    // Assert
    // Check that an event was emitted with the right topic
    expect(context.emit).toHaveBeenCalledWith(expect.objectContaining({
      topic: 'mcts.iterations.completed'
    }));
    
    // Check the data contains the expected properties
    const emitData = context.emit.mock.calls[0][0].data;
    expect(emitData).toHaveProperty('nodes');
    expect(emitData).toHaveProperty('rootId');
    expect(emitData).toHaveProperty('currentIteration', 0);
    expect(emitData).toHaveProperty('maxIterations', 0);
  });

  it('should handle errors in repository creation', async () => {
    // Arrange
    const context = createTestContext();
    const error = new Error('Repository not found');
    
    // Setup mocks to throw error
    (Commits.create as jest.Mock).mockRejectedValue(error);
    
    // Mock Date.now and toISOString
    const originalToISOString = Date.prototype.toISOString;
    Date.prototype.toISOString = jest.fn(() => '2023-08-15T12:00:00.000Z');
    
    // Act
    await handler(sampleInput, context as any);
    
    // Assert
    expect(context.logger.error).toHaveBeenCalledWith('Error in controller step', error);
    expect(context.emit).toHaveBeenCalledWith({
      topic: 'review.error',
      data: {
        message: 'Repository not found',
        timestamp: '2023-08-15T12:00:00.000Z'
      }
    });
    
    // Restore original toISOString
    Date.prototype.toISOString = originalToISOString;
  });

  it('should handle errors in commit evaluation', async () => {
    // Arrange
    const context = createTestContext();
    const mockCommits = createMockCommits();
    const error = new Error('Evaluation failed');
    
    // Setup mocks
    (Commits.create as jest.Mock).mockResolvedValue(mockCommits);
    (evaluateCommits as jest.Mock).mockRejectedValue(error);
    
    // Mock Date.now and toISOString
    const originalToISOString = Date.prototype.toISOString;
    Date.prototype.toISOString = jest.fn(() => '2023-08-15T12:00:00.000Z');
    
    // Act
    await handler(sampleInput, context as any);
    
    // Assert
    expect(context.logger.error).toHaveBeenCalledWith('Error in controller step', error);
    expect(context.emit).toHaveBeenCalledWith({
      topic: 'review.error',
      data: {
        message: 'Evaluation failed',
        timestamp: '2023-08-15T12:00:00.000Z'
      }
    });
    
    // Restore original toISOString
    Date.prototype.toISOString = originalToISOString;
  });
}); 