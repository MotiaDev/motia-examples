import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRateLimiter } from './rate-limiter.js'

describe('lib/rate-limiter.js', () => {
  describe('createRateLimiter', () => {
    it('should create rate limiter with valid configuration', () => {
      const limiter = createRateLimiter({ burst: 3, windowSec: 60 })
      
      expect(limiter).toHaveProperty('isAllowed')
      expect(limiter).toHaveProperty('consume')
      expect(limiter).toHaveProperty('getTokenCount')
      expect(limiter).toHaveProperty('getTimeUntilNextToken')
      expect(limiter).toHaveProperty('reset')
      expect(limiter).toHaveProperty('config')
      
      expect(limiter.config.burst).toBe(3)
      expect(limiter.config.windowSec).toBe(60)
      expect(limiter.config.refillRate).toBe(3 / (60 * 1000))
    })

    it('should throw error for invalid burst parameter', () => {
      expect(() => createRateLimiter({ burst: 0, windowSec: 60 }))
        .toThrow('burst must be a positive number')
      
      expect(() => createRateLimiter({ burst: -1, windowSec: 60 }))
        .toThrow('burst must be a positive number')
      
      expect(() => createRateLimiter({ burst: 'invalid', windowSec: 60 }))
        .toThrow('burst must be a positive number')
      
      expect(() => createRateLimiter({ windowSec: 60 }))
        .toThrow('burst must be a positive number')
    })

    it('should throw error for invalid windowSec parameter', () => {
      expect(() => createRateLimiter({ burst: 3, windowSec: 0 }))
        .toThrow('windowSec must be a positive number')
      
      expect(() => createRateLimiter({ burst: 3, windowSec: -1 }))
        .toThrow('windowSec must be a positive number')
      
      expect(() => createRateLimiter({ burst: 3, windowSec: 'invalid' }))
        .toThrow('windowSec must be a positive number')
      
      expect(() => createRateLimiter({ burst: 3 }))
        .toThrow('windowSec must be a positive number')
    })
  })

  describe('token bucket behavior', () => {
    let limiter

    beforeEach(() => {
      limiter = createRateLimiter({ burst: 3, windowSec: 60 })
    })

    describe('isAllowed', () => {
      it('should allow requests when tokens are available', () => {
        expect(limiter.isAllowed('https://example.com')).toBe(true)
      })

      it('should throw error for invalid site URL', () => {
        expect(() => limiter.isAllowed('')).toThrow('siteUrl must be a valid string')
        expect(() => limiter.isAllowed(null)).toThrow('siteUrl must be a valid string')
        expect(() => limiter.isAllowed(123)).toThrow('siteUrl must be a valid string')
      })

      it('should not consume tokens when checking', () => {
        const site = 'https://example.com'
        
        expect(limiter.getTokenCount(site)).toBe(3)
        expect(limiter.isAllowed(site)).toBe(true)
        expect(limiter.getTokenCount(site)).toBe(3) // Should not change
      })
    })

    describe('consume', () => {
      it('should consume tokens and return true when available', () => {
        const site = 'https://example.com'
        
        expect(limiter.consume(site)).toBe(true)
        expect(limiter.getTokenCount(site)).toBe(2)
        
        expect(limiter.consume(site)).toBe(true)
        expect(limiter.getTokenCount(site)).toBe(1)
        
        expect(limiter.consume(site)).toBe(true)
        expect(limiter.getTokenCount(site)).toBe(0)
      })

      it('should return false when no tokens available', () => {
        const site = 'https://example.com'
        
        // Consume all tokens
        limiter.consume(site)
        limiter.consume(site)
        limiter.consume(site)
        
        expect(limiter.consume(site)).toBe(false)
        expect(limiter.getTokenCount(site)).toBe(0)
      })

      it('should throw error for invalid site URL', () => {
        expect(() => limiter.consume('')).toThrow('siteUrl must be a valid string')
        expect(() => limiter.consume(null)).toThrow('siteUrl must be a valid string')
        expect(() => limiter.consume(123)).toThrow('siteUrl must be a valid string')
      })
    })

    describe('getTokenCount', () => {
      it('should return initial burst count for new sites', () => {
        expect(limiter.getTokenCount('https://example.com')).toBe(3)
        expect(limiter.getTokenCount('https://test.org')).toBe(3)
      })

      it('should return correct count after consumption', () => {
        const site = 'https://example.com'
        
        limiter.consume(site)
        expect(limiter.getTokenCount(site)).toBe(2)
        
        limiter.consume(site)
        expect(limiter.getTokenCount(site)).toBe(1)
      })

      it('should throw error for invalid site URL', () => {
        expect(() => limiter.getTokenCount('')).toThrow('siteUrl must be a valid string')
        expect(() => limiter.getTokenCount(null)).toThrow('siteUrl must be a valid string')
        expect(() => limiter.getTokenCount(123)).toThrow('siteUrl must be a valid string')
      })
    })

    describe('per-site isolation', () => {
      it('should maintain separate token buckets per site', () => {
        const site1 = 'https://example.com'
        const site2 = 'https://test.org'
        
        // Consume tokens from site1
        limiter.consume(site1)
        limiter.consume(site1)
        
        // site2 should still have full tokens
        expect(limiter.getTokenCount(site1)).toBe(1)
        expect(limiter.getTokenCount(site2)).toBe(3)
        
        // Consume from site2
        limiter.consume(site2)
        
        expect(limiter.getTokenCount(site1)).toBe(1)
        expect(limiter.getTokenCount(site2)).toBe(2)
      })
    })

    describe('reset', () => {
      it('should clear all buckets', () => {
        const site1 = 'https://example.com'
        const site2 = 'https://test.org'
        
        // Consume some tokens
        limiter.consume(site1)
        limiter.consume(site2)
        
        expect(limiter.getTokenCount(site1)).toBe(2)
        expect(limiter.getTokenCount(site2)).toBe(2)
        
        // Reset
        limiter.reset()
        
        // Should start fresh
        expect(limiter.getTokenCount(site1)).toBe(3)
        expect(limiter.getTokenCount(site2)).toBe(3)
      })
    })

    describe('getTimeUntilNextToken', () => {
      it('should return 0 when tokens are available', () => {
        const site = 'https://example.com'
        
        expect(limiter.getTimeUntilNextToken(site)).toBe(0)
        
        limiter.consume(site)
        expect(limiter.getTimeUntilNextToken(site)).toBe(0)
      })

      it('should return time estimate when no tokens available', () => {
        const site = 'https://example.com'
        
        // Consume all tokens
        limiter.consume(site)
        limiter.consume(site)
        limiter.consume(site)
        
        const timeUntilNext = limiter.getTimeUntilNextToken(site)
        expect(timeUntilNext).toBeGreaterThan(0)
        expect(timeUntilNext).toBeLessThanOrEqual(60 * 1000) // Should be within window
      })

      it('should throw error for invalid site URL', () => {
        expect(() => limiter.getTimeUntilNextToken('')).toThrow('siteUrl must be a valid string')
        expect(() => limiter.getTimeUntilNextToken(null)).toThrow('siteUrl must be a valid string')
        expect(() => limiter.getTimeUntilNextToken(123)).toThrow('siteUrl must be a valid string')
      })
    })
  })

  describe('token replenishment', () => {
    let limiter

    beforeEach(() => {
      vi.useFakeTimers()
      limiter = createRateLimiter({ burst: 2, windowSec: 10 }) // 2 tokens per 10 seconds
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should replenish tokens over time', () => {
      const site = 'https://example.com'
      
      // Consume all tokens
      expect(limiter.consume(site)).toBe(true) // 1 left
      expect(limiter.consume(site)).toBe(true) // 0 left
      expect(limiter.consume(site)).toBe(false) // None left
      
      // Advance time by half the window (5 seconds)
      vi.advanceTimersByTime(5000)
      
      // Should have 1 token back
      expect(limiter.getTokenCount(site)).toBe(1)
      expect(limiter.consume(site)).toBe(true)
      
      // Advance time by full window (10 seconds total)
      vi.advanceTimersByTime(5000)
      
      // Should be back to full capacity (or close to it due to timing precision)
      expect(limiter.getTokenCount(site)).toBeGreaterThanOrEqual(1)
      expect(limiter.getTokenCount(site)).toBeLessThanOrEqual(2)
    })

    it('should not exceed burst capacity during replenishment', () => {
      const site = 'https://example.com'
      
      // Start with full tokens, advance time significantly
      vi.advanceTimersByTime(60000) // 1 minute
      
      // Should still be capped at burst capacity
      expect(limiter.getTokenCount(site)).toBe(2)
    })

    it('should handle partial token replenishment', () => {
      const site = 'https://example.com'
      
      // Consume one token
      limiter.consume(site)
      expect(limiter.getTokenCount(site)).toBe(1)
      
      // Advance time by quarter window (2.5 seconds)
      vi.advanceTimersByTime(2500)
      
      // Should have partial replenishment (1.5 tokens, floored to 1)
      expect(limiter.getTokenCount(site)).toBe(1)
      
      // Advance a bit more (2.5 more seconds = 5 total)
      vi.advanceTimersByTime(2500)
      
      // Should now have 2 tokens (full)
      expect(limiter.getTokenCount(site)).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should handle very small burst values', () => {
      const limiter = createRateLimiter({ burst: 1, windowSec: 1 })
      const site = 'https://example.com'
      
      expect(limiter.getTokenCount(site)).toBe(1)
      expect(limiter.consume(site)).toBe(true)
      expect(limiter.consume(site)).toBe(false)
    })

    it('should handle very large burst values', () => {
      vi.useFakeTimers()
      const limiter = createRateLimiter({ burst: 1000, windowSec: 1 })
      const site = 'https://example.com'
      
      expect(limiter.getTokenCount(site)).toBe(1000)
      
      // Consume many tokens quickly without time passing
      for (let i = 0; i < 500; i++) {
        expect(limiter.consume(site)).toBe(true)
      }
      
      // Should have consumed exactly 500 tokens, leaving 500 remaining
      expect(limiter.getTokenCount(site)).toBe(500)
      
      vi.useRealTimers()
    })

    it('should handle fractional refill rates correctly', () => {
      // 1 token per 3 seconds (very slow refill)
      const limiter = createRateLimiter({ burst: 1, windowSec: 3 })
      const site = 'https://example.com'
      
      vi.useFakeTimers()
      
      // Consume the token
      limiter.consume(site)
      expect(limiter.getTokenCount(site)).toBe(0)
      
      // Advance by 1 second - should still be 0
      vi.advanceTimersByTime(1000)
      expect(limiter.getTokenCount(site)).toBe(0)
      
      // Advance by 2 more seconds (3 total) - should have 1 token
      vi.advanceTimersByTime(2000)
      expect(limiter.getTokenCount(site)).toBe(1)
      
      vi.useRealTimers()
    })
  })
})