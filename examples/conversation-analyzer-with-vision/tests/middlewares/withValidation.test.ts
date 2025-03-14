import { z } from 'zod';
import { withValidation } from '../../middlewares/withValidation';
import { BadRequestError } from '../../errors/BadRequestError';

describe('withValidation Middleware', () => {
  const mockHandler = jest.fn();
  const mockContext = {
    logger: {
      info: jest.fn(),
      error: jest.fn(),
    },
    emit: jest.fn(),
    traceId: 'test-trace-id',
    state: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandler.mockResolvedValue({ status: 200, body: { success: true } });
  });

  it('should pass validated body to handler', async () => {
    // Arrange
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });
    const middleware = withValidation(schema);
    const wrappedHandler = middleware(mockHandler);
    const req = {
      body: { name: 'John', age: 30, extraField: 'should be removed' },
    };

    // Act
    await wrappedHandler(req as any, mockContext as any);

    // Assert
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(
      {
        ...req,
        body: { name: 'John', age: 30 }, // extraField should be removed
      },
      mockContext
    );
  });

  it('should throw BadRequestError for invalid input', async () => {
    // Arrange
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const middleware = withValidation(schema);
    const wrappedHandler = middleware(mockHandler);
    const req = {
      body: { name: 'John', age: 'thirty' }, // age should be a number
    };

    // Act & Assert
    await expect(wrappedHandler(req as any, mockContext as any)).rejects.toThrow(BadRequestError);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should use default values from schema', async () => {
    // Arrange
    const schema = z.object({
      name: z.string(),
      age: z.number().default(25),
    });
    const middleware = withValidation(schema);
    const wrappedHandler = middleware(mockHandler);
    const req = {
      body: { name: 'John' }, // age missing, should use default
    };

    // Act
    await wrappedHandler(req as any, mockContext as any);

    // Assert
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(
      {
        ...req,
        body: { name: 'John', age: 25 }, // age should be set to default
      },
      mockContext
    );
  });

  it('should pass through non-Zod errors', async () => {
    // Arrange
    const schema = z.object({
      name: z.string(),
    });
    const middleware = withValidation(schema);
    const customError = new Error('Custom error');
    const errorHandler = jest.fn().mockImplementation(() => {
      throw customError;
    });
    const wrappedHandler = middleware(errorHandler);
    const req = {
      body: { name: 'John' },
    };

    // Act & Assert
    await expect(wrappedHandler(req as any, mockContext as any)).rejects.toThrow(customError);
    expect(errorHandler).toHaveBeenCalledTimes(1);
  });
});
