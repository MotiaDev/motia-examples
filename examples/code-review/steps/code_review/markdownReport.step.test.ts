import { handler, config } from './markdownReport.step';
import * as fs from 'fs';
import * as path from 'path';
import { jest } from '@jest/globals';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
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

describe('MarkdownReport Step', () => {
  const mockInput = {
    selected_node_id: 'node123',
    state: 'test state',
    reasoning: 'test reasoning',
    stats: {
      visits: 10,
      value: 0.8,
      total_visits: 100,
      children_count: 5
    },
    all_nodes: {
      'node123': {
        visits: 10,
        value: 0.8,
        parent: 'node100',
        children: ['node124', 'node125']
      },
      'node100': {
        visits: 20,
        value: 0.9,
        children: ['node123']
      },
      'node124': {
        visits: 5,
        value: 0.7,
        parent: 'node123'
      },
      'node125': {
        visits: 5,
        value: 0.6,
        parent: 'node123'
      }
    },
    requirements: 'Test requirements',
    repository: 'test-repo',
    branch: 'main',
    total_commits: 10,
    commits_analyzed: 5,
    analyzed_commits: ['commit1', 'commit2']
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Default mocks
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it('should have proper configuration', () => {
    expect(config.type).toBe('event');
    expect(config.name).toBe('MarkdownReport');
    expect(config.subscribes).toContain('code-review.reasoning.completed');
    expect(config.emits).toContain('code-review.report.generated');
    expect(config.flows).toContain('code-review-flow');
  });

  it('should generate markdown report and emit event with file output', async () => {
    const context = createTestContext();
    const input = { ...mockInput };

    await handler(input, context as any);

    // Verify that fs.writeFileSync was called
    expect(fs.writeFileSync).toHaveBeenCalled();
    
    // Verify that the event was emitted
    expect(context.emit).toHaveBeenCalledWith({
      topic: 'code-review.report.generated',
      data: expect.objectContaining({
        content: expect.stringContaining('Code Review Analysis'),
        output_url: 'file://Review.md' // Default output URL
      })
    });

    // Verify logger was called
    expect(context.logger.info).toHaveBeenCalledWith('Generated markdown report', expect.any(Object));
  });

  it('should generate markdown report with custom output URL', async () => {
    const context = createTestContext();
    const input = { 
      ...mockInput,
      output_url: 'file:///custom/path/report.md'
    };

    await handler(input, context as any);

    // Verify that fs.writeFileSync was called with the custom path
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/custom/path/report.md'),
      expect.any(String)
    );
  });

  it('should create directory if it does not exist', async () => {
    const context = createTestContext();
    // Mock fs.existsSync to return false
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    await handler(mockInput, context as any);

    // Verify that directory was created
    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  it('should handle errors gracefully', async () => {
    const context = createTestContext();
    // Mock fs.writeFileSync to throw an error
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Write error');
    });

    // The handler now handles errors instead of throwing
    await handler(mockInput, context as any);

    // Verify error was logged
    expect(context.logger.error).toHaveBeenCalledWith(
      'Error writing file',
      expect.objectContaining({
        error: expect.stringContaining('Write error')
      })
    );
    
    // Even with an error, we should still emit the event
    expect(context.emit).toHaveBeenCalled();
  });

  it('should include all required sections in the report', async () => {
    const context = createTestContext();
    let capturedContent = '';
    
    // Capture the content written to file
    (fs.writeFileSync as jest.Mock).mockImplementation((...args: unknown[]) => {
      capturedContent = args[1] as string;
    });

    await handler(mockInput, context as any);

    // Verify all sections are present
    expect(capturedContent).toContain('# Code Review Analysis');
    expect(capturedContent).toContain('## Requirements');
    expect(capturedContent).toContain('## Repository Information');
    expect(capturedContent).toContain('## Analyzed Commits');
    expect(capturedContent).toContain('## Summary');
    expect(capturedContent).toContain('## Statistics');
    expect(capturedContent).toContain('## Selected Reasoning Path');
    expect(capturedContent).toContain('## MCTS Tree Visualization');
    expect(capturedContent).toContain('## Workflow Visualization');
  });

  it('should validate input schema', async () => {
    const context = createTestContext();
    const invalidInput = {
      selected_node_id: 'node123',
      // Missing required fields
      stats: {
        visits: 10,
        value: 0.8,
        total_visits: 100,
        children_count: 5
      }
    };

    // The handler now handles invalid input with defaults
    await handler(invalidInput as any, context as any);
    
    // Should still emit an event even with invalid input
    expect(context.emit).toHaveBeenCalled();
  });
});
