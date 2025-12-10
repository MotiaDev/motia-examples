import { describe, it, expect, beforeEach } from 'vitest'
import { 
  updateLastStatus, 
  getSnapshot, 
  getPreviousStatus, 
  clearAllStatuses, 
  getSiteCount 
} from './streams.js'

describe('lib/streams.js', () => {
  beforeEach(() => {
    // Clear all statuses before each test
    clearAllStatuses()
  })

  describe('updateLastStatus', () => {
    it('should store a valid check result', () => {
      const result = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      updateLastStatus(result)
      
      const stored = getPreviousStatus('https://example.com')
      expect(stored).toEqual(result)
    })

    it('should update existing status for same URL', () => {
      const firstResult = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      const secondResult = {
        url: 'https://example.com',
        status: 'DOWN',
        code: 500,
        responseTime: 5000,
        checkedAt: '2024-01-01T12:01:00Z',
        error: 'Internal Server Error'
      }

      updateLastStatus(firstResult)
      updateLastStatus(secondResult)
      
      const stored = getPreviousStatus('https://example.com')
      expect(stored).toEqual(secondResult)
      expect(stored).not.toEqual(firstResult)
    })

    it('should store results for multiple URLs independently', () => {
      const result1 = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      const result2 = {
        url: 'https://test.org',
        status: 'DOWN',
        code: null,
        responseTime: 0,
        checkedAt: '2024-01-01T12:00:00Z',
        error: 'Connection timeout'
      }

      updateLastStatus(result1)
      updateLastStatus(result2)
      
      expect(getPreviousStatus('https://example.com')).toEqual(result1)
      expect(getPreviousStatus('https://test.org')).toEqual(result2)
    })

    it('should create a copy of the result object', () => {
      const result = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      updateLastStatus(result)
      
      // Modify original object
      result.status = 'DOWN'
      result.code = 500
      
      // Stored version should be unchanged
      const stored = getPreviousStatus('https://example.com')
      expect(stored.status).toBe('UP')
      expect(stored.code).toBe(200)
    })

    describe('validation', () => {
      it('should throw error for null/undefined result', () => {
        expect(() => updateLastStatus(null)).toThrow('Result must be a valid object')
        expect(() => updateLastStatus(undefined)).toThrow('Result must be a valid object')
      })

      it('should throw error for non-object result', () => {
        expect(() => updateLastStatus('string')).toThrow('Result must be a valid object')
        expect(() => updateLastStatus(123)).toThrow('Result must be a valid object')
        expect(() => updateLastStatus([])).toThrow('Result must be a valid object')
      })

      it('should throw error for missing or invalid URL', () => {
        const baseResult = {
          status: 'UP',
          code: 200,
          responseTime: 150,
          checkedAt: '2024-01-01T12:00:00Z',
          error: null
        }

        expect(() => updateLastStatus(baseResult)).toThrow('Result must have a valid URL string')
        expect(() => updateLastStatus({ ...baseResult, url: '' })).toThrow('Result must have a valid URL string')
        expect(() => updateLastStatus({ ...baseResult, url: 123 })).toThrow('Result must have a valid URL string')
        expect(() => updateLastStatus({ ...baseResult, url: null })).toThrow('Result must have a valid URL string')
      })

      it('should throw error for missing or invalid status', () => {
        const baseResult = {
          url: 'https://example.com',
          code: 200,
          responseTime: 150,
          checkedAt: '2024-01-01T12:00:00Z',
          error: null
        }

        expect(() => updateLastStatus(baseResult)).toThrow('Result must have a valid status (UP or DOWN)')
        expect(() => updateLastStatus({ ...baseResult, status: '' })).toThrow('Result must have a valid status (UP or DOWN)')
        expect(() => updateLastStatus({ ...baseResult, status: 'UNKNOWN' })).toThrow('Result must have a valid status (UP or DOWN)')
        expect(() => updateLastStatus({ ...baseResult, status: 123 })).toThrow('Result must have a valid status (UP or DOWN)')
      })

      it('should throw error for invalid responseTime', () => {
        const baseResult = {
          url: 'https://example.com',
          status: 'UP',
          code: 200,
          checkedAt: '2024-01-01T12:00:00Z',
          error: null
        }

        expect(() => updateLastStatus(baseResult)).toThrow('Result must have a valid responseTime (non-negative number)')
        expect(() => updateLastStatus({ ...baseResult, responseTime: -1 })).toThrow('Result must have a valid responseTime (non-negative number)')
        expect(() => updateLastStatus({ ...baseResult, responseTime: 'fast' })).toThrow('Result must have a valid responseTime (non-negative number)')
        expect(() => updateLastStatus({ ...baseResult, responseTime: null })).toThrow('Result must have a valid responseTime (non-negative number)')
      })

      it('should throw error for missing or invalid checkedAt', () => {
        const baseResult = {
          url: 'https://example.com',
          status: 'UP',
          code: 200,
          responseTime: 150,
          error: null
        }

        expect(() => updateLastStatus(baseResult)).toThrow('Result must have a valid checkedAt timestamp')
        expect(() => updateLastStatus({ ...baseResult, checkedAt: '' })).toThrow('Result must have a valid checkedAt timestamp')
        expect(() => updateLastStatus({ ...baseResult, checkedAt: 123 })).toThrow('Result must have a valid checkedAt timestamp')
        expect(() => updateLastStatus({ ...baseResult, checkedAt: null })).toThrow('Result must have a valid checkedAt timestamp')
      })

      it('should accept valid status values', () => {
        const baseResult = {
          url: 'https://example.com',
          code: 200,
          responseTime: 150,
          checkedAt: '2024-01-01T12:00:00Z',
          error: null
        }

        expect(() => updateLastStatus({ ...baseResult, status: 'UP' })).not.toThrow()
        expect(() => updateLastStatus({ ...baseResult, status: 'DOWN' })).not.toThrow()
      })

      it('should accept zero responseTime', () => {
        const result = {
          url: 'https://example.com',
          status: 'DOWN',
          code: null,
          responseTime: 0,
          checkedAt: '2024-01-01T12:00:00Z',
          error: 'Connection failed'
        }

        expect(() => updateLastStatus(result)).not.toThrow()
      })

      it('should accept null values for optional fields', () => {
        const result = {
          url: 'https://example.com',
          status: 'DOWN',
          code: null,
          responseTime: 0,
          checkedAt: '2024-01-01T12:00:00Z',
          error: null
        }

        expect(() => updateLastStatus(result)).not.toThrow()
      })
    })
  })

  describe('getSnapshot', () => {
    it('should return empty object when no statuses stored', () => {
      const snapshot = getSnapshot()
      expect(snapshot).toEqual({})
    })

    it('should return all stored statuses', () => {
      const result1 = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      const result2 = {
        url: 'https://test.org',
        status: 'DOWN',
        code: 500,
        responseTime: 5000,
        checkedAt: '2024-01-01T12:01:00Z',
        error: 'Server error'
      }

      updateLastStatus(result1)
      updateLastStatus(result2)
      
      const snapshot = getSnapshot()
      expect(snapshot).toEqual({
        'https://example.com': result1,
        'https://test.org': result2
      })
    })

    it('should return copies of stored objects', () => {
      const result = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      updateLastStatus(result)
      
      const snapshot = getSnapshot()
      
      // Modify snapshot
      snapshot['https://example.com'].status = 'DOWN'
      
      // Original stored data should be unchanged
      const stored = getPreviousStatus('https://example.com')
      expect(stored.status).toBe('UP')
    })

    it('should reflect latest updates', () => {
      const firstResult = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      const secondResult = {
        url: 'https://example.com',
        status: 'DOWN',
        code: 500,
        responseTime: 5000,
        checkedAt: '2024-01-01T12:01:00Z',
        error: 'Server error'
      }

      updateLastStatus(firstResult)
      let snapshot = getSnapshot()
      expect(snapshot['https://example.com'].status).toBe('UP')
      
      updateLastStatus(secondResult)
      snapshot = getSnapshot()
      expect(snapshot['https://example.com'].status).toBe('DOWN')
    })
  })

  describe('getPreviousStatus', () => {
    it('should return null for unknown URL', () => {
      const result = getPreviousStatus('https://unknown.com')
      expect(result).toBeNull()
    })

    it('should return stored status for known URL', () => {
      const result = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      updateLastStatus(result)
      
      const retrieved = getPreviousStatus('https://example.com')
      expect(retrieved).toEqual(result)
    })

    it('should return a copy of the stored object', () => {
      const result = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      updateLastStatus(result)
      
      const retrieved = getPreviousStatus('https://example.com')
      
      // Modify retrieved object
      retrieved.status = 'DOWN'
      
      // Original stored data should be unchanged
      const retrievedAgain = getPreviousStatus('https://example.com')
      expect(retrievedAgain.status).toBe('UP')
    })

    it('should throw error for invalid URL parameter', () => {
      expect(() => getPreviousStatus('')).toThrow('URL must be a valid string')
      expect(() => getPreviousStatus(null)).toThrow('URL must be a valid string')
      expect(() => getPreviousStatus(undefined)).toThrow('URL must be a valid string')
      expect(() => getPreviousStatus(123)).toThrow('URL must be a valid string')
    })
  })

  describe('clearAllStatuses', () => {
    it('should remove all stored statuses', () => {
      const result1 = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      const result2 = {
        url: 'https://test.org',
        status: 'DOWN',
        code: 500,
        responseTime: 5000,
        checkedAt: '2024-01-01T12:01:00Z',
        error: 'Server error'
      }

      updateLastStatus(result1)
      updateLastStatus(result2)
      
      expect(getSiteCount()).toBe(2)
      expect(getSnapshot()).not.toEqual({})
      
      clearAllStatuses()
      
      expect(getSiteCount()).toBe(0)
      expect(getSnapshot()).toEqual({})
      expect(getPreviousStatus('https://example.com')).toBeNull()
      expect(getPreviousStatus('https://test.org')).toBeNull()
    })

    it('should work when no statuses are stored', () => {
      expect(() => clearAllStatuses()).not.toThrow()
      expect(getSiteCount()).toBe(0)
    })
  })

  describe('getSiteCount', () => {
    it('should return 0 when no sites are tracked', () => {
      expect(getSiteCount()).toBe(0)
    })

    it('should return correct count after adding sites', () => {
      const result1 = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      const result2 = {
        url: 'https://test.org',
        status: 'DOWN',
        code: 500,
        responseTime: 5000,
        checkedAt: '2024-01-01T12:01:00Z',
        error: 'Server error'
      }

      updateLastStatus(result1)
      expect(getSiteCount()).toBe(1)
      
      updateLastStatus(result2)
      expect(getSiteCount()).toBe(2)
    })

    it('should not increase count when updating existing site', () => {
      const firstResult = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      const secondResult = {
        url: 'https://example.com',
        status: 'DOWN',
        code: 500,
        responseTime: 5000,
        checkedAt: '2024-01-01T12:01:00Z',
        error: 'Server error'
      }

      updateLastStatus(firstResult)
      expect(getSiteCount()).toBe(1)
      
      updateLastStatus(secondResult)
      expect(getSiteCount()).toBe(1)
    })

    it('should return 0 after clearing all statuses', () => {
      const result = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        checkedAt: '2024-01-01T12:00:00Z',
        error: null
      }

      updateLastStatus(result)
      expect(getSiteCount()).toBe(1)
      
      clearAllStatuses()
      expect(getSiteCount()).toBe(0)
    })
  })

  describe('thread safety and concurrent access', () => {
    it('should handle rapid updates to same URL', () => {
      const baseResult = {
        url: 'https://example.com',
        status: 'UP',
        code: 200,
        responseTime: 150,
        error: null
      }

      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        updateLastStatus({
          ...baseResult,
          checkedAt: `2024-01-01T12:${i.toString().padStart(2, '0')}:00Z`,
          responseTime: i * 10
        })
      }

      const final = getPreviousStatus('https://example.com')
      expect(final.responseTime).toBe(990) // Last update
      expect(getSiteCount()).toBe(1)
    })

    it('should handle concurrent updates to different URLs', () => {
      const urls = Array.from({ length: 50 }, (_, i) => `https://site${i}.com`)
      
      // Update all URLs
      urls.forEach((url, i) => {
        updateLastStatus({
          url,
          status: i % 2 === 0 ? 'UP' : 'DOWN',
          code: i % 2 === 0 ? 200 : 500,
          responseTime: i * 10,
          checkedAt: '2024-01-01T12:00:00Z',
          error: null
        })
      })

      expect(getSiteCount()).toBe(50)
      
      const snapshot = getSnapshot()
      expect(Object.keys(snapshot)).toHaveLength(50)
      
      // Verify each URL has correct data
      urls.forEach((url, i) => {
        const stored = getPreviousStatus(url)
        expect(stored.url).toBe(url)
        expect(stored.responseTime).toBe(i * 10)
      })
    })
  })
})