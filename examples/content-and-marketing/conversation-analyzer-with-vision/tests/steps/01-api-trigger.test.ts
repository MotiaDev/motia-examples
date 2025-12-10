import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import { ApiRequest, FlowContext, Logger } from 'motia';
import { handler, config } from '../../steps/01-api-trigger.step';

jest.mock('fs');
jest.mock('path');

describe('API Trigger Step', () => {
  // Setup mocks
  const mockTraceId = 'test-trace-id';
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    traceId: mockTraceId,
    flows: ['default'],
    step: 'test-step',
    emitLog: jest.fn(),
  } as unknown as Logger;

  const mockEmit = jest
    .fn()
    .mockImplementation(() => Promise.resolve()) as unknown as FlowContext['emit'];
  const mockState = {
    get: jest.fn().mockImplementation(() => Promise.resolve(null)),
    set: jest.fn().mockImplementation(() => Promise.resolve()),
    delete: jest.fn().mockImplementation(() => Promise.resolve()),
    clear: jest.fn().mockImplementation(() => Promise.resolve()),
  } as unknown as FlowContext['state'];

  const mockContext: FlowContext = {
    logger: mockLogger,
    emit: mockEmit,
    traceId: mockTraceId,
    state: mockState,
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReset();
    (path.resolve as jest.Mock).mockReset();
  });

  describe('Configuration', () => {
    it('should have the correct API configuration', () => {
      expect(config).toEqual({
        type: 'api',
        name: 'Conversation Reader Trigger',
        description: 'Triggers the conversation screenshot reading process',
        path: '/conversation-analyzer/start',
        method: 'POST',
        emits: ['conversation-reader-start'],
        flows: ['default'],
      });
    });
  });

  describe('Handler', () => {
    it('should successfully trigger the conversation reader process', async () => {
      // Arrange
      const folderPath = 'conversations/real-estate-negotiation';
      const fullPath = '/mock/path/conversations/real-estate-negotiation';
      const req: ApiRequest = {
        body: { folderPath },
        headers: {},
        pathParams: {},
        queryParams: {},
      };

      (path.resolve as jest.Mock).mockReturnValue(fullPath);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Act
      const result = await handler(req, mockContext);

      // Assert
      expect(result).toEqual({
        status: 200,
        body: {
          message: `Successfully triggered the conversation screenshot processing for folder: ${folderPath}`,
          folderPath,
          traceId: mockTraceId,
        },
      });

      expect(path.resolve).toHaveBeenCalledWith(expect.any(String), folderPath);
      expect(fs.existsSync).toHaveBeenCalledWith(fullPath);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Triggering conversation screenshot reader from ${folderPath}`,
        req
      );
      expect(mockEmit).toHaveBeenCalledWith({
        topic: 'conversation-reader-start',
        data: {
          folderPath,
          traceId: mockTraceId,
        },
      });
    });

    it('should throw BadRequestError if folder does not exist', async () => {
      // Arrange
      const folderPath = 'conversations/non-existent';
      const fullPath = '/mock/path/conversations/non-existent';
      const req: ApiRequest = {
        body: { folderPath },
        headers: {},
        pathParams: {},
        queryParams: {},
      };

      (path.resolve as jest.Mock).mockReturnValue(fullPath);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Act
      const result = await handler(req, mockContext);

      // Assert
      const body = result.body as Record<string, any>;

      expect(result.status).toBe(400);
      expect(body.error).toBe(`Folder ${folderPath} does not exist`);
      expect(path.resolve).toHaveBeenCalledWith(expect.any(String), folderPath);
      expect(fs.existsSync).toHaveBeenCalledWith(fullPath);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should handle validation errors for invalid input', async () => {
      // Arrange
      const req: ApiRequest = {
        body: { folderPath: 123 },
        headers: {},
        pathParams: {},
        queryParams: {},
      };

      // Act
      const result = await handler(req, mockContext);

      // Assert
      const body = result.body as Record<string, any>;

      expect(result.status).toBe(400);
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeDefined();
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('Middleware Integration', () => {
    it('should pass validation for valid input', async () => {
      // Arrange
      const folderPath = 'conversations/real-estate-negotiation';
      const fullPath = '/mock/path/conversations/real-estate-negotiation';
      const req: ApiRequest = {
        body: { folderPath, extraField: 'should be ignored' },
        headers: {},
        pathParams: {},
        queryParams: {},
      };

      (path.resolve as jest.Mock).mockReturnValue(fullPath);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Act
      const result = await handler(req, mockContext);

      // Assert
      expect(result.status).toBe(200);
      expect(mockEmit).toHaveBeenCalledWith({
        topic: 'conversation-reader-start',
        data: {
          folderPath,
          traceId: mockTraceId,
          // The validation middleware should have stripped out extraField
        },
      });
    });
  });
});
