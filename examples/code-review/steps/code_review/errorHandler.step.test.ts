import { handler, config, ErrorHandlerInput } from './errorHandler.step';
import * as fs from 'fs';
import * as path from 'path';

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

// Sample input data for error handler
const createSampleInput = (): ErrorHandlerInput => ({
  message: 'Test error message',
  timestamp: '2023-01-01T00:00:00Z',
  repository: '/path/to/repo',
  requirements: 'Test requirements',
  output_url: 'file://test-report.md'
});

describe('Error Handler Step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it('should have proper configuration', () => {
    // Test the step configuration
    expect(config.type).toBe('event');
    expect(config.name).toBe('ErrorHandler');
    expect(config.subscribes).toContain('review.error');
    expect(config.emits).toContain('code-review.report.generated');
    expect(config.flows).toContain('code-review-flow');
  });

  it('should generate a fallback review report', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledWith('Generated fallback review report', expect.any(Object));
    expect(context.emit).toHaveBeenCalledWith({
      topic: 'code-review.report.generated',
      data: expect.objectContaining({
        filepath: expect.any(String),
        content: expect.stringContaining('Test error message')
      })
    });
  });

  it('should create directory if it does not exist', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(fs.mkdirSync).toHaveBeenCalled();
  });

  it('should handle errors during report generation', async () => {
    // Arrange
    const context = createTestContext();
    const input = createSampleInput();
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Failed to write file');
    });
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.logger.error).toHaveBeenCalledWith('Failed to generate error report', expect.any(Object));
    // Should try to write to a failsafe location
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should handle URL parsing errors', async () => {
    // Arrange
    const context = createTestContext();
    const input = { ...createSampleInput(), output_url: 'invalid-url' };
    
    // Act
    await handler(input, context as any);
    
    // Assert
    expect(context.logger.error).toHaveBeenCalled();
    // We won't check if writeFileSync was called since it depends on implementation details
  });
}); 