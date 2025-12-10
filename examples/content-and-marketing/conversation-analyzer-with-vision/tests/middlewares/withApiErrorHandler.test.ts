import { withApiErrorHandler } from '../../middlewares/withApiErrorHandler';
import { ServiceError } from '../../errors/ServiceError';
import { BadRequestError } from '../../errors/BadRequestError';

describe('withApiErrorHandler Middleware', () => {
  const mockContext = {
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
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
  });

  it('should pass through successful responses', async () => {
    // Arrange
    const successResponse = { status: 200, body: { success: true } };
    const mockHandler = jest.fn().mockResolvedValue(successResponse);
    const wrappedHandler = withApiErrorHandler(mockHandler);
    const req = { body: {} };

    // Act
    const result = await wrappedHandler(req as any, mockContext as any);

    // Assert
    expect(result).toEqual(successResponse);
    expect(mockHandler).toHaveBeenCalledWith(req, mockContext);
    expect(mockContext.logger.error).not.toHaveBeenCalled();
  });

  it('should handle StepError with appropriate status code', async () => {
    // Arrange
    const errorDetails = { field: 'test', message: 'Invalid field' };
    const stepError = new BadRequestError('Bad request error', errorDetails);
    const mockHandler = jest.fn().mockImplementation(() => {
      throw stepError;
    });
    const wrappedHandler = withApiErrorHandler(mockHandler);
    const req = { body: {} };

    // Act
    const result = await wrappedHandler(req as any, mockContext as any);

    // Assert
    expect(result).toEqual({
      status: 400, // BadRequestError status code
      body: {
        error: 'Bad request error',
        details: errorDetails,
      },
    });
    expect(mockContext.logger.error).toHaveBeenCalledWith('Error in API handler', stepError);
  });

  it('should handle generic errors with 500 status code', async () => {
    // Arrange
    const genericError = new Error('Something went wrong');
    const mockHandler = jest.fn().mockImplementation(() => {
      throw genericError;
    });
    const wrappedHandler = withApiErrorHandler(mockHandler);
    const req = { body: {} };

    // Act
    const result = await wrappedHandler(req as any, mockContext as any);

    // Assert
    expect(result).toEqual({
      status: 500,
      body: {
        error: 'Internal server error',
        message: 'Something went wrong',
      },
    });
    expect(mockContext.logger.error).toHaveBeenCalledWith('Error in API handler', genericError);
  });

  it('should handle non-Error objects with 500 status code', async () => {
    // Arrange
    const nonError = 'This is not an error object';
    const mockHandler = jest.fn().mockImplementation(() => {
      throw nonError;
    });
    const wrappedHandler = withApiErrorHandler(mockHandler);
    const req = { body: {} };

    // Act
    const result = await wrappedHandler(req as any, mockContext as any);

    // Assert
    expect(result).toEqual({
      status: 500,
      body: {
        error: 'Internal server error',
        message: 'Unknown error',
      },
    });
    expect(mockContext.logger.error).toHaveBeenCalledWith('Error in API handler', nonError);
  });
});
