import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { clearAllStatuses } from '../lib/streams.js'

// Mock environment variables for testing
const mockEnv = {
  DISCORD_WEBHOOK: 'https://discord.com/api/webhooks/123/test',
  SITES: '["https://example.com", "https://test.org"]',
  CHECK_INTERVAL_CRON: '*/1 * * * *',
  ALERT_BURST: '3',
  ALERT_WINDOW_SEC: '300'
}

describe('Integration Tests', () => {
  let originalEnv
  let mockFetch

  beforeEach(() => {
    // Save and set environment variables
    originalEnv = { ...process.env }
    Object.assign(process.env, mockEnv)
    
    // Clear module cache and status store
    vi.resetModules()
    clearAllStatuses()
    
    // Mock fetch globally
    mockFetch = vi.fn()
    global.fetch = mockFetch
    
    // Mock performance.now for consistent timing
    vi.spyOn(performance, 'now').mockReturnValue(1000)
  })

  afterEach(() => {
    // Restore environment and mocks
    process.env = originalEnv
    vi.resetModules()
    vi.restoreAllMocks()
    clearAllStatuses()
  })

  describe('Complete event flow: cron → checker → alerter', () => {
    it('should execute complete flow from cron trigger to Discord alert', async () => {
      // Import modules after environment is set
      const { handler: cronHandler } = await import('../steps/cron.step.js')
      const { handler: checkerHandler } = await import('../steps/checker.step.js')
      const { handler: alerterHandler } = await import('../steps/alerter.step.js')

      // Mock successful HTTP response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      })

      // Mock Discord webhook response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      })

      // Mock context objects
      const cronContext = {
        logger: {
          info: vi.fn(),
          error: vi.fn()
        },
        emit: vi.fn()
      }

      const checkerContext = {
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          debug: vi.fn()
        },
        emit: vi.fn()
      }

      const alerterContext = {
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          warn: vi.fn()
        }
      }

      // Step 1: Execute cron handler
      await cronHandler(cronContext)

      // Verify cron emitted check requests (using old format)
      expect(cronContext.emit).toHaveBeenCalledTimes(2)
      expect(cronContext.emit).toHaveBeenCalledWith('check.requested', { url: 'https://example.com' })
      expect(cronContext.emit).toHaveBeenCalledWith('check.requested', { url: 'https://test.org' })

      // Step 2: Execute checker handler for first site
      const checkInput = { url: 'https://example.com' }
      await checkerHandler(checkInput, checkerContext)

      // Verify checker made HTTP request
      expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'User-Agent': 'Motia-Uptime-Monitor/1.0'
        })
      }))

      // Verify checker emitted results
      expect(checkerContext.emit).toHaveBeenCalledTimes(2)
      expect(checkerContext.emit).toHaveBeenCalledWith('check.result', expect.objectContaining({
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: expect.any(Number)
      }))

      // Step 3: Execute alerter handler (should not trigger alert since status hasn't changed)
      const alertInput = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }
      await alerterHandler(alertInput, alerterContext)

      // Should not trigger alert since status hasn't changed (UP -> UP)
      expect(alerterContext.logger.debug).toHaveBeenCalledWith(
        'Status unchanged, no alert needed',
        { url: 'https://example.com', status: 'UP', previousStatus: 'UP' }
      )

      // Step 4: Execute checker again with failure
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))
      await checkerHandler(checkInput, checkerContext)

      // Step 5: Execute alerter with status change
      const alertInputDown = {
        url: 'https://example.com',
        status: 'DOWN',
        code: null,
        responseTime: 0,
        checkedAt: '2024-01-01T12:01:00Z',
        error: 'Connection refused'
      }
      await alerterHandler(alertInputDown, alerterContext)

      // Should trigger Discord alert for status change
      expect(alerterContext.logger.info).toHaveBeenCalledWith(
        'Status change detected',
        expect.objectContaining({
          url: 'https://example.com',
          previousStatus: 'UP',
          newStatus: 'DOWN',
          transition: 'UP → DOWN'
        })
      )

      // Verify Discord webhook was called
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/123/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('example.com')
        })
      )
    })

    it('should handle HTTP request failures in checker', async () => {
      const { handler: checkerHandler } = await import('../steps/checker.step.js')

      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const context = {
        logger: {
          info: vi.fn(),
          error: vi.fn()
        },
        emit: vi.fn()
      }

      const input = { url: 'https://example.com' }
      await checkerHandler(input, context)

      // Verify error was handled and DOWN status emitted
      expect(context.emit).toHaveBeenCalledWith('check.result', expect.objectContaining({
        url: 'https://example.com',
        status: 'DOWN',
        code: null,
        error: expect.stringContaining('Network error')
      }))
    })

    it('should handle rate limiting in alerter', async () => {
      const { handler: alerterHandler } = await import('../steps/alerter.step.js')
      const { updateLastStatus } = await import('../lib/streams.js')

      // Set up initial status
      updateLastStatus({
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      })

      const context = {
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          warn: vi.fn()
        }
      }

      const alertInput = {
        url: 'https://example.com',
        status: 'DOWN',
        code: 500,
        responseTime: 5000,
        checkedAt: '2024-01-01T12:01:00Z',
        error: 'Server error'
      }

      // Mock successful Discord webhook for first few calls
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200
      })

      // Send multiple alerts rapidly to trigger rate limiting
      for (let i = 0; i < 5; i++) {
        await alerterHandler(alertInput, context)
      }

      // Should have rate limited some alerts
      expect(context.logger.warn).toHaveBeenCalledWith(
        'Alert rate limited',
        expect.objectContaining({
          url: 'https://example.com',
          status: 'DOWN'
        })
      )
    })
  })

  describe('Stream emission and subscription handling', () => {
    it('should handle dashboard stream subscriptions', async () => {
      const { handler: dashboardHandler } = await import('../steps/dashboard.step.js')

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          debug: vi.fn(),
          error: vi.fn()
        }
      }

      // Test status stream event
      const streamInput = {
        type: 'push',
        data: {
          payload: {
            url: 'https://example.com',
            status: 'UP',
            code: 200,
            responseTime: 150,
            checkedAt: '2024-01-01T12:00:00Z',
            error: null
          }
        }
      }

      await dashboardHandler(streamInput, context)

      // Should log the event
      expect(context.logger.info).toHaveBeenCalledWith(
        'Dashboard received status stream event',
        expect.objectContaining({
          hasData: true,
          type: 'push'
        })
      )

      expect(context.logger.info).toHaveBeenCalledWith(
        'Website status update',
        expect.objectContaining({
          url: 'https://example.com',
          status: 'UP',
          responseTime: 150
        })
      )
    })

    it('should handle stream errors gracefully', async () => {
      const { handler: dashboardHandler } = await import('../steps/dashboard.step.js')

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          debug: vi.fn(),
          error: vi.fn()
        }
      }

      // Test with null input
      await dashboardHandler(null, context)

      // Should log the null input
      expect(context.logger.info).toHaveBeenCalledWith(
        'Dashboard received status stream event',
        expect.objectContaining({
          input: 'null/undefined',
          hasData: false
        })
      )

      // Test with undefined input
      await dashboardHandler(undefined, context)

      expect(context.logger.info).toHaveBeenCalledWith(
        'Dashboard received status stream event',
        expect.objectContaining({
          input: 'null/undefined',
          hasData: false
        })
      )
    })
  })

  describe('Health endpoint responses', () => {
    it('should return correct health status', async () => {
      const { handler: healthHandler } = await import('../steps/health.step.js')
      const { updateLastStatus } = await import('../lib/streams.js')

      // Set up some status data
      updateLastStatus({
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      })

      updateLastStatus({
        url: 'https://test.org',
        status: 'DOWN',
        code: 500,
        responseTime: 5000,
        checkedAt: '2024-01-01T12:01:00Z',
        error: 'Server error'
      })

      const context = {
        logger: {
          info: vi.fn(),
          error: vi.fn()
        }
      }

      const result = await healthHandler({}, context)

      expect(result).toEqual({
        status: 200,
        body: {
          status: 'ok',
          sitesConfigured: 2,
          lastKnown: {
            'https://example.com': expect.objectContaining({
              status: 'UP',
              code: 200
            }),
            'https://test.org': expect.objectContaining({
              status: 'DOWN',
              code: 500
            })
          },
          now: expect.any(String)
        }
      })

      // Verify ISO8601 timestamp format
      expect(result.body.now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should handle health endpoint errors gracefully', async () => {
      // Mock getSnapshot to throw error by spying on it
      const { getSnapshot } = await import('../lib/streams.js')
      const getSnapshotSpy = vi.spyOn(await import('../lib/streams.js'), 'getSnapshot')
      getSnapshotSpy.mockImplementation(() => {
        throw new Error('Stream error')
      })

      const { handler: healthHandler } = await import('../steps/health.step.js')

      const context = {
        logger: {
          info: vi.fn(),
          error: vi.fn()
        }
      }

      const result = await healthHandler({}, context)

      expect(result.status).toBe(200)
      expect(result.body).toEqual({
        status: 'ok',
        sitesConfigured: 0, // Error handling sets this to 0
        lastKnown: {},
        now: expect.any(String),
        error: 'Stream error'
      })

      expect(context.logger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.objectContaining({
          error: 'Stream error'
        })
      )

      getSnapshotSpy.mockRestore()
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle invalid URLs in checker', async () => {
      const { handler: checkerHandler } = await import('../steps/checker.step.js')

      const context = {
        logger: {
          info: vi.fn(),
          error: vi.fn()
        },
        emit: vi.fn()
      }

      const input = { url: 'ftp://invalid-protocol.com' }
      await checkerHandler(input, context)

      expect(context.emit).toHaveBeenCalledWith('check.result', expect.objectContaining({
        status: 'DOWN',
        error: 'Only HTTP and HTTPS protocols are supported'
      }))
    })

    it('should handle Discord webhook failures in alerter', async () => {
      const { handler: alerterHandler } = await import('../steps/alerter.step.js')
      const { updateLastStatus } = await import('../lib/streams.js')

      // Set up initial status
      updateLastStatus({
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      })

      // Mock Discord webhook failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Invalid webhook')
      })

      const context = {
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          warn: vi.fn()
        }
      }

      const alertInput = {
        url: 'https://example.com',
        status: 'DOWN',
        code: 500,
        responseTime: 5000,
        checkedAt: '2024-01-01T12:01:00Z',
        error: 'Server error'
      }

      await alerterHandler(alertInput, context)

      expect(context.logger.error).toHaveBeenCalledWith(
        'Failed to send Discord webhook',
        expect.objectContaining({
          error: expect.stringContaining('Discord webhook failed: 400')
        })
      )
    })

    it('should handle timeout errors in checker', async () => {
      const { handler: checkerHandler } = await import('../steps/checker.step.js')

      // Mock AbortError (timeout)
      const abortError = new Error('Request timeout')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const context = {
        logger: {
          info: vi.fn(),
          error: vi.fn()
        },
        emit: vi.fn()
      }

      const input = { url: 'https://slow-site.com' }
      await checkerHandler(input, context)

      expect(context.emit).toHaveBeenCalledWith('check.result', expect.objectContaining({
        status: 'DOWN',
        error: 'Request timeout (10s)'
      }))
    })
  })
})