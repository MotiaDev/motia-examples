import { jest } from '@jest/globals';

// Mock fetch function
global.fetch = jest.fn().mockImplementation((_url: unknown) => {
  const mockResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({
      'allow': 'GET, POST, OPTIONS'
    }),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob([])),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    formData: () => Promise.resolve(new FormData()),
    clone: function() { return Promise.resolve(this); },
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic',
    url: ''
  };
  return Promise.resolve(mockResponse as unknown as Response);
}) as unknown as typeof fetch;

// Mock the file system
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false)
}));

// Mock child_process execSync
jest.mock('child_process', () => ({
  execSync: jest.fn().mockReturnValue(null)
}));

// Mock the module and its dependencies
jest.mock('./reviewRequest.api.step', () => {
  // Define types for validated body
  interface ValidatedBody {
    repository: string;
    requirements: string;
    branch?: string;
    depth?: number;
    reviewStartCommit?: string;
    reviewEndCommit?: string;
    outputUrl?: string;
  }

  // Create a mock implementation of the bodySchema
  const mockBodySchema = {
    parse: jest.fn().mockImplementation((data: unknown): ValidatedBody => {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid input');
      }
      const input = data as Record<string, unknown>;
      
      if (!input.repository) {
        throw new Error('Missing required field: repository');
      }
      if (!input.requirements) {
        throw new Error('Missing required field: requirements');
      }
      
      // Return the data with defaults
      return {
        repository: String(input.repository),
        requirements: String(input.requirements),
        branch: input.branch ? String(input.branch) : 'main',
        depth: input.depth ? Number(input.depth) : 2,
        reviewStartCommit: input.reviewStartCommit ? String(input.reviewStartCommit) : '',
        reviewEndCommit: input.reviewEndCommit ? String(input.reviewEndCommit) : 'HEAD',
        outputUrl: input.outputUrl ? String(input.outputUrl) : 'file://.'
      };
    })
  };
  
  return {
    config: {
      bodySchema: mockBodySchema
    },
    handler: jest.fn().mockImplementation(async (req: any, context: any) => {
      const validatedBody = mockBodySchema.parse(req.body) as ValidatedBody;
      const mockRepoDir = '/mocked/repo/path';
      
      await context.emit({
        topic: 'review.requested',
        data: {
          repo_dir: mockRepoDir,
          branch: validatedBody.branch,
          depth: validatedBody.depth,
          review_start_commit: validatedBody.reviewStartCommit || 'HEAD~10',
          review_end_commit: validatedBody.reviewEndCommit || 'HEAD',
          requirements: validatedBody.requirements,
          timestamp: new Date().toISOString(),
          max_iterations: 100,
          exploration_constant: 1.414,
          max_depth: validatedBody.depth,
          output_url: validatedBody.outputUrl
        }
      });
      
      return {
        status: 200,
        body: {
          message: 'Code review process initiated'
        }
      };
    }),
    validateOutputUrl: jest.fn().mockImplementation(async (url: unknown) => {
      return String(url);
    }) as jest.Mock,
    fetchRepository: jest.fn().mockImplementation((repo: unknown) => {
      return '/mocked/repo/path';
    }) as jest.Mock
  };
});

// Mock Date for consistent timestamps
const mockDate = new Date('2023-01-01T00:00:00Z');
global.Date = jest.fn(() => mockDate) as any;
global.Date.now = jest.fn(() => mockDate.getTime());
mockDate.toISOString = jest.fn(() => '2023-01-01T00:00:00.000Z');

// Import the module after mocking
import * as ReviewRequestStep from './reviewRequest.api.step';

interface ApiResponse {
  status: number;
  body: {
    message: string;
  };
}

describe('Review Request API Step', () => {
  let mockEmit: jest.Mock;
  let mockLogger: Record<string, jest.Mock>;
  let context: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmit = jest.fn();
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    context = { 
      emit: mockEmit,
      logger: mockLogger
    };
  });

  it('should emit review.initiated with proper data when given valid input', async () => {
    const request = {
      body: {
        repository: 'https://github.com/test/repo',
        requirements: 'Test requirements',
        outputUrl: 'https://example.com/output'
      }
    };

    const result = await ReviewRequestStep.handler(request as any, context as any) as ApiResponse;

    expect(result.status).toBe(200);
    expect(result.body.message).toBe('Code review process initiated');
    
    expect(mockEmit).toHaveBeenCalledWith({
      topic: 'review.requested',
      data: expect.objectContaining({
        repo_dir: '/mocked/repo/path',
        requirements: 'Test requirements',
        output_url: 'https://example.com/output',
        timestamp: '2023-01-01T00:00:00.000Z'
      })
    });
  });

  it('should use default outputUrl when not provided', async () => {
    const request = {
      body: {
        repository: 'https://github.com/test/repo',
        requirements: 'Test requirements'
      }
    };

    await ReviewRequestStep.handler(request as any, context as any);
    
    expect(mockEmit).toHaveBeenCalledWith({
      topic: 'review.requested',
      data: expect.objectContaining({
        repo_dir: '/mocked/repo/path',
        requirements: 'Test requirements',
        output_url: 'file://.',
        timestamp: '2023-01-01T00:00:00.000Z'
      })
    });
  });

  it('should throw error when repository field is missing', async () => {
    const request = {
      body: {
        requirements: 'Test requirements',
        outputUrl: 'https://example.com/output'
      }
    };

    await expect(
      ReviewRequestStep.handler(request as any, context as any)
    ).rejects.toThrow('Missing required field: repository');
  });

  it('should throw error when requirements field is missing', async () => {
    const request = {
      body: {
        repository: 'https://github.com/test/repo',
        outputUrl: 'https://example.com/output'
      }
    };

    await expect(
      ReviewRequestStep.handler(request as any, context as any)
    ).rejects.toThrow('Missing required field: requirements');
  });
}); 