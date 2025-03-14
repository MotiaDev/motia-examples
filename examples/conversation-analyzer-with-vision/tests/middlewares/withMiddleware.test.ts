import { withMiddleware } from '../../middlewares/withMiddleware';

describe('withMiddleware Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should compose middlewares in the correct order', async () => {
    // Arrange
    const mockHandler = jest.fn().mockResolvedValue('result');

    const middleware1 = jest.fn().mockImplementation((handler) => {
      return async (...args) => {
        const result = await handler(...args);
        return `middleware1(${result})`;
      };
    });

    const middleware2 = jest.fn().mockImplementation((handler) => {
      return async (...args) => {
        const result = await handler(...args);
        return `middleware2(${result})`;
      };
    });

    // Act
    const composedHandler = withMiddleware(middleware1, middleware2, mockHandler);
    const result = await composedHandler('arg1', 'arg2');

    // Assert
    expect(result).toBe('middleware1(middleware2(result))');
    expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2');
    expect(middleware1).toHaveBeenCalledTimes(1);
    expect(middleware2).toHaveBeenCalledTimes(1);
  });

  it('should work with a single middleware', async () => {
    // Arrange
    const mockHandler = jest.fn().mockResolvedValue('result');

    const middleware = jest.fn().mockImplementation((handler) => {
      return async (...args) => {
        const result = await handler(...args);
        return `middleware(${result})`;
      };
    });

    // Act
    const composedHandler = withMiddleware(middleware, mockHandler);
    const result = await composedHandler('arg');

    // Assert
    expect(result).toBe('middleware(result)');
    expect(mockHandler).toHaveBeenCalledWith('arg');
    expect(middleware).toHaveBeenCalledTimes(1);
  });

  it('should return the original handler if no middlewares are provided', async () => {
    // Arrange
    const mockHandler = jest.fn().mockResolvedValue('result');

    // Act
    const composedHandler = withMiddleware(mockHandler);
    const result = await composedHandler('arg');

    // Assert
    expect(result).toBe('result');
    expect(mockHandler).toHaveBeenCalledWith('arg');
  });

  it('should apply middlewares in right-to-left order (last middleware is applied first)', async () => {
    // Arrange
    const executionOrder: string[] = [];
    const mockHandler = jest.fn().mockImplementation(() => {
      executionOrder.push('handler');
      return 'result';
    });

    const middleware1 = jest.fn().mockImplementation((handler) => {
      return async (...args) => {
        executionOrder.push('middleware1 before');
        const result = await handler(...args);
        executionOrder.push('middleware1 after');
        return result;
      };
    });

    const middleware2 = jest.fn().mockImplementation((handler) => {
      return async (...args) => {
        executionOrder.push('middleware2 before');
        const result = await handler(...args);
        executionOrder.push('middleware2 after');
        return result;
      };
    });

    // Act
    const composedHandler = withMiddleware(middleware1, middleware2, mockHandler);
    await composedHandler();

    // Assert
    expect(executionOrder).toEqual([
      'middleware1 before',
      'middleware2 before',
      'handler',
      'middleware2 after',
      'middleware1 after',
    ]);
  });
});
