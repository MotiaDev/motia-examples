import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import TypeScript step handler (API step)
import { handler as likeApiHandler } from './like-api.step'

// Note: Python step handlers (enqueue-side-effects, notify-owner, update-feed) 
// cannot be directly imported in TypeScript tests. This integration test will
// focus on testing the API step and verifying event emission, while the Python
// steps should be tested separately with Python testing frameworks.

// Mock the schemas module
vi.mock('./schemas', () => ({
  EVENT_TOPICS: {
    LIKE_POST: 'like:post',
    LIKE_NOTIFY_OWNER: 'like:notify-owner',
    LIKE_UPDATE_FEED: 'like:update-feed'
  },
  FLOW_NAME: 'micro-actions-like-feed',
  LikePostEventSchema: {
    safeParse: vi.fn()
  },
  NotifyOwnerEventSchema: {
    safeParse: vi.fn()
  },
  UpdateFeedEventSchema: {
    safeParse: vi.fn()
  }
}))

describe('Integration Tests - API Step and Event Emission', () => {
  let mockLogger: any
  let capturedEvents: Array<{ topic: string; data: any }>
  let mockEmit: any
  let mockContext: any

  beforeEach(async () => {
    // Reset captured events
    capturedEvents = []

    // Create mock logger that captures all log calls
    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }

    // Create mock emit that captures all emitted events
    mockEmit = vi.fn().mockImplementation(({ topic, data }) => {
      capturedEvents.push({ topic, data })
      return Promise.resolve()
    })

    mockContext = {
      logger: mockLogger,
      emit: mockEmit,
      traceId: 'integration-test-trace'
    }
  })

  describe('API step and event emission', () => {
    it('should execute API call and emit like:post event correctly', async () => {
      // Step 1: Trigger API endpoint
      const apiRequest = { url: '/like/test-post-123' }
      const apiResponse = await likeApiHandler(apiRequest, mockContext)

      // Verify API response
      expect(apiResponse.status).toBe(200)
      expect(apiResponse.body).toEqual({
        success: true,
        message: 'Post liked successfully',
        postId: 'test-post-123',
        traceId: 'integration-test-trace'
      })

      // Verify like:post event was emitted
      expect(capturedEvents).toHaveLength(1)
      expect(capturedEvents[0]).toEqual({
        topic: 'like:post',
        data: {
          postId: 'test-post-123',
          userId: 'user-demo',
          timestamp: expect.any(String),
          traceId: 'integration-test-trace'
        }
      })

      // Verify API step logs
      const allLogCalls = mockLogger.info.mock.calls
      expect(allLogCalls).toContainEqual([
        'Processing like request',
        { postId: 'test-post-123', traceId: 'integration-test-trace' }
      ])
      expect(allLogCalls).toContainEqual([
        'Like stored in memory',
        { postId: 'test-post-123', userId: 'user-demo', traceId: 'integration-test-trace' }
      ])

      // Verify no errors were logged
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should handle different postId formats through API step', async () => {
      const testPostIds = ['post-123', 'post_456', '789', 'complex-post-id-123']

      for (const postId of testPostIds) {
        // Reset mocks for each test
        capturedEvents = []
        mockLogger.info.mockClear()
        mockLogger.error.mockClear()

        // Execute API call
        const apiRequest = { url: `/like/${postId}` }
        const apiResponse = await likeApiHandler(apiRequest, mockContext)

        expect(apiResponse.status).toBe(200)
        expect(apiResponse.body.postId).toBe(postId)

        // Verify event was emitted with correct postId
        expect(capturedEvents).toHaveLength(1)
        expect(capturedEvents[0].data.postId).toBe(postId)

        // Verify postId appears in API logs
        const logMessages = mockLogger.info.mock.calls.map((call: any) => call[0])
        expect(logMessages.some((msg: string) => msg.includes('Processing like request'))).toBe(true)
      }
    })
  })

  describe('Event emission verification', () => {
    it('should verify proper event structure from API step', async () => {
      const apiRequest = { url: '/like/data-flow-test' }
      await likeApiHandler(apiRequest, mockContext)

      // Verify like:post event structure
      const likePostEvent = capturedEvents[0]
      expect(likePostEvent.topic).toBe('like:post')
      expect(likePostEvent.data).toMatchObject({
        postId: 'data-flow-test',
        userId: 'user-demo',
        timestamp: expect.any(String),
        traceId: 'integration-test-trace'
      })

      // Verify event data has all required fields
      expect(likePostEvent.data.postId).toBe('data-flow-test')
      expect(likePostEvent.data.userId).toBe('user-demo')
      expect(likePostEvent.data.timestamp).toBeDefined()
      expect(likePostEvent.data.traceId).toBe('integration-test-trace')
    })

    it('should maintain traceId in API step and emitted events', async () => {
      const customTraceId = 'custom-trace-12345'
      const customContext = { ...mockContext, traceId: customTraceId }

      // Execute API call with custom traceId
      const apiRequest = { url: '/like/trace-test' }
      await likeApiHandler(apiRequest, customContext)

      // Verify traceId is present in API log calls
      const allLogCalls = mockLogger.info.mock.calls
      allLogCalls.forEach((call: any) => {
        if (call[1] && typeof call[1] === 'object') {
          expect(call[1]).toHaveProperty('traceId', customTraceId)
        }
      })

      // Verify traceId in emitted event
      expect(capturedEvents).toHaveLength(1)
      expect(capturedEvents[0].data).toHaveProperty('traceId', customTraceId)
    })
  })

  describe('Error scenarios and handling', () => {
    it('should handle API validation errors correctly', async () => {
      // Test with invalid postId
      const apiRequest = { url: '/like/' } // Empty postId
      const apiResponse = await likeApiHandler(apiRequest, mockContext)

      expect(apiResponse.status).toBe(400)
      expect(apiResponse.body.error).toBe('Bad Request')

      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid postId parameter',
        expect.objectContaining({
          postId: '',
          traceId: 'integration-test-trace'
        })
      )

      // Verify no events were emitted for invalid request
      expect(capturedEvents).toHaveLength(0)
    })

    it('should continue API workflow even when event emission fails', async () => {
      // Mock emit to fail
      mockEmit.mockRejectedValueOnce(new Error('Event emission failed'))

      const apiRequest = { url: '/like/emission-fail-test' }
      const apiResponse = await likeApiHandler(apiRequest, mockContext)

      // API should still return success
      expect(apiResponse.status).toBe(200)
      expect(apiResponse.body.success).toBe(true)

      // Verify error was logged but processing continued
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to emit like:post event',
        expect.objectContaining({
          error: 'Event emission failed',
          postId: 'emission-fail-test'
        })
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Continuing with success response despite event emission failure',
        expect.objectContaining({
          postId: 'emission-fail-test'
        })
      )
    })

    it('should handle various invalid postId formats', async () => {
      const invalidPostIds = ['', 'post with spaces', 'a'.repeat(101)] // Empty, spaces, too long

      for (const postId of invalidPostIds) {
        // Reset mocks for each test
        capturedEvents = []
        mockLogger.error.mockClear()

        const apiRequest = { url: `/like/${postId}` }
        const apiResponse = await likeApiHandler(apiRequest, mockContext)

        // All should return 400 Bad Request
        expect(apiResponse.status).toBe(400)
        expect(apiResponse.body.error).toBe('Bad Request')

        // Verify error was logged
        expect(mockLogger.error).toHaveBeenCalled()

        // Verify no events were emitted for invalid requests
        expect(capturedEvents).toHaveLength(0)
      }
    })
  })

  describe('API step logging validation', () => {
    it('should validate API step logging output format', async () => {
      const apiRequest = { url: '/like/logging-test' }
      await likeApiHandler(apiRequest, mockContext)

      // Verify all log calls use context.logger.info (not console.log)
      expect(mockLogger.info).toHaveBeenCalled()

      // Verify log messages include expected content
      const logMessages = mockLogger.info.mock.calls.map((call: any) => call[0])
      
      // API logs should mention the postId
      expect(logMessages.some((msg: string) => 
        msg.includes('Processing like request')
      )).toBe(true)

      expect(logMessages.some((msg: string) => 
        msg.includes('Like stored in memory')
      )).toBe(true)

      // Verify all log context objects include required fields
      const logContexts = mockLogger.info.mock.calls.map((call: any) => call[1])
      logContexts.forEach((context: any) => {
        if (context && typeof context === 'object') {
          expect(context).toHaveProperty('traceId')
          if (context.postId) {
            expect(context.postId).toBe('logging-test')
          }
        }
      })
    })

    it('should ensure API step emits events with like: prefix', async () => {
      const apiRequest = { url: '/like/event-naming-test' }
      await likeApiHandler(apiRequest, mockContext)

      // Verify the emitted event uses like: prefix
      expect(capturedEvents).toHaveLength(1)
      expect(capturedEvents[0].topic).toBe('like:post')
      expect(capturedEvents[0].topic).toMatch(/^like:/)
    })
  })

  describe('Performance and concurrency', () => {
    it('should handle multiple concurrent API requests', async () => {
      const postIds = ['concurrent-1', 'concurrent-2', 'concurrent-3']
      const promises = postIds.map(async (postId, index) => {
        const customContext = {
          ...mockContext,
          traceId: `concurrent-trace-${index}`
        }

        const apiRequest = { url: `/like/${postId}` }
        return likeApiHandler(apiRequest, customContext)
      })

      const responses = await Promise.all(promises)

      // Verify all requests succeeded
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        expect(response.body.postId).toBe(postIds[index])
      })

      // Verify all events were captured
      expect(capturedEvents).toHaveLength(3)
      postIds.forEach(postId => {
        expect(capturedEvents.some(e => e.data.postId === postId)).toBe(true)
      })
    })
  })
})