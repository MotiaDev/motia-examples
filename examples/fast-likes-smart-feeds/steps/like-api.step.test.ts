import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './like-api.step'

// Mock the schemas module
vi.mock('./schemas', () => ({
  EVENT_TOPICS: {
    LIKE_POST: 'like:post'
  },
  FLOW_NAME: 'micro-actions-like-feed',
  LikePostEvent: {}
}))

describe('LikeApi Step Handler', () => {
  let mockLogger: any
  let mockEmit: any
  let mockContext: any
  const testTraceId = 'test-trace-123'

  beforeEach(() => {
    // Reset mocks before each test
    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }
    
    mockEmit = vi.fn().mockResolvedValue(undefined)
    
    mockContext = {
      logger: mockLogger,
      emit: mockEmit,
      traceId: testTraceId
    }
  })

  describe('Valid postId scenarios', () => {
    it('should successfully process a valid postId', async () => {
      const mockRequest = {
        url: '/like/post-123'
      }

      const result = await handler(mockRequest, mockContext)

      expect(result.status).toBe(200)
      expect(result.body).toEqual({
        success: true,
        message: 'Post liked successfully',
        postId: 'post-123',
        traceId: testTraceId
      })

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Processing like request',
        { postId: 'post-123', traceId: testTraceId }
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Like stored in memory',
        { postId: 'post-123', userId: 'user-demo', traceId: testTraceId }
      )

      // Verify event emission
      expect(mockEmit).toHaveBeenCalledWith({
        topic: 'like:post',
        data: {
          postId: 'post-123',
          userId: 'user-demo',
          timestamp: expect.any(String),
          traceId: testTraceId
        }
      })
    })

    it('should handle postId with hyphens and underscores', async () => {
      const mockRequest = {
        url: '/like/post-123_test-456'
      }

      const result = await handler(mockRequest, mockContext)

      expect(result.status).toBe(200)
      expect(result.body.postId).toBe('post-123_test-456')
    })

    it('should handle numeric postId', async () => {
      const mockRequest = {
        url: '/like/12345'
      }

      const result = await handler(mockRequest, mockContext)

      expect(result.status).toBe(200)
      expect(result.body.postId).toBe('12345')
    })
  })

  describe('Invalid postId scenarios', () => {
    it('should return 400 for empty postId', async () => {
      const mockRequest = {
        url: '/like/'
      }

      const result = await handler(mockRequest, mockContext)

      expect(result.status).toBe(400)
      expect(result.body).toEqual({
        error: 'Bad Request',
        message: expect.stringContaining('Invalid postId parameter')
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid postId parameter',
        expect.objectContaining({
          postId: '',
          traceId: testTraceId
        })
      )
    })

    it('should return 400 for postId with invalid characters', async () => {
      const mockRequest = {
        url: '/like/post with spaces'
      }

      const result = await handler(mockRequest, mockContext)

      expect(result.status).toBe(400)
      expect(result.body).toEqual({
        error: 'Bad Request',
        message: expect.stringContaining('postId contains invalid characters')
      })
    })

    it('should return 400 for postId that is too long', async () => {
      const longPostId = 'a'.repeat(101) // 101 characters, exceeds max of 100
      const mockRequest = {
        url: `/like/${longPostId}`
      }

      const result = await handler(mockRequest, mockContext)

      expect(result.status).toBe(400)
      expect(result.body).toEqual({
        error: 'Bad Request',
        message: expect.stringContaining('postId too long')
      })
    })

    it('should return 400 for missing URL', async () => {
      const mockRequest = {}

      const result = await handler(mockRequest, mockContext)

      expect(result.status).toBe(400)
      expect(result.body).toEqual({
        error: 'Bad Request',
        message: 'Invalid request format'
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Missing request URL',
        { traceId: testTraceId }
      )
    })
  })

  describe('Error handling scenarios', () => {
    it('should continue with success response even if event emission fails', async () => {
      mockEmit.mockRejectedValue(new Error('Event emission failed'))
      
      const mockRequest = {
        url: '/like/post-123'
      }

      const result = await handler(mockRequest, mockContext)

      expect(result.status).toBe(200)
      expect(result.body.success).toBe(true)

      // Verify error was logged but didn't block the response
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to emit like:post event',
        expect.objectContaining({
          error: 'Event emission failed',
          postId: 'post-123',
          traceId: testTraceId
        })
      )

      // Verify continuation log
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Continuing with success response despite event emission failure',
        { postId: 'post-123', traceId: testTraceId }
      )
    })

    it('should handle unexpected errors gracefully', async () => {
      // Mock an error in the URL parsing by providing malformed request
      const mockRequest = {
        get url() {
          throw new Error('Unexpected error')
        }
      }

      const result = await handler(mockRequest, mockContext)

      expect(result.status).toBe(500)
      expect(result.body).toEqual({
        error: 'Internal Server Error',
        message: 'Failed to process like request'
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error processing like request',
        expect.objectContaining({
          error: 'Unexpected error',
          traceId: testTraceId
        })
      )
    })
  })

  describe('Storage functionality', () => {
    it('should store multiple likes for the same post', async () => {
      const mockRequest = {
        url: '/like/post-123'
      }

      // First like
      const result1 = await handler(mockRequest, mockContext)
      expect(result1.status).toBe(200)

      // Second like (with different context to simulate different user/time)
      const mockContext2 = {
        ...mockContext,
        traceId: 'test-trace-456'
      }
      
      const result2 = await handler(mockRequest, mockContext2)
      expect(result2.status).toBe(200)

      // Both should succeed
      expect(mockLogger.info).toHaveBeenCalledTimes(6) // 3 calls per request
    })
  })
})