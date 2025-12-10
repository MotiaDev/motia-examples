import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('lib/env.js', () => {
  let originalEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
    // Clear all environment variables that might affect tests
    delete process.env.DISCORD_WEBHOOK
    delete process.env.SITES
    delete process.env.CHECK_INTERVAL_CRON
    delete process.env.ALERT_BURST
    delete process.env.ALERT_WINDOW_SEC
    // Clear module cache
    vi.resetModules()
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    vi.resetModules()
  })

  describe('Discord webhook validation', () => {
    it('should accept valid Discord webhook URLs', async () => {
      process.env.DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/123/abc'
      process.env.SITES = '["https://example.com"]'
      
      const { config } = await import('./env.js')
      expect(config.discordWebhook).toBe('https://discord.com/api/webhooks/123/abc')
    })

    it('should accept discordapp.com webhook URLs', async () => {
      process.env.DISCORD_WEBHOOK = 'https://discordapp.com/api/webhooks/123/abc'
      process.env.SITES = '["https://example.com"]'
      
      const { config } = await import('./env.js')
      expect(config.discordWebhook).toBe('https://discordapp.com/api/webhooks/123/abc')
    })

    it('should throw error for missing Discord webhook', async () => {
      delete process.env.DISCORD_WEBHOOK
      process.env.SITES = '["https://example.com"]'
      
      await expect(import('./env.js')).rejects.toThrow('DISCORD_WEBHOOK environment variable is required')
    })

    it('should throw error for invalid Discord webhook URL', async () => {
      process.env.DISCORD_WEBHOOK = 'https://example.com/webhook'
      process.env.SITES = '["https://example.com"]'
      
      await expect(import('./env.js')).rejects.toThrow('DISCORD_WEBHOOK must be a valid Discord webhook URL')
    })

    it('should throw error for malformed webhook URL', async () => {
      process.env.DISCORD_WEBHOOK = 'not-a-url'
      process.env.SITES = '["https://example.com"]'
      
      await expect(import('./env.js')).rejects.toThrow('DISCORD_WEBHOOK must be a valid Discord webhook URL')
    })
  })

  describe('Sites configuration', () => {
    beforeEach(() => {
      process.env.DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/123/abc'
    })

    it('should parse valid sites JSON array', async () => {
      process.env.SITES = '["https://example.com", "https://test.org"]'
      
      const { config } = await import('./env.js')
      expect(config.sites).toEqual(['https://example.com', 'https://test.org'])
    })

    it('should throw error for missing SITES', async () => {
      delete process.env.SITES
      
      await expect(import('./env.js')).rejects.toThrow('SITES environment variable is required')
    })

    it('should throw error for invalid JSON', async () => {
      process.env.SITES = 'not-json'
      
      await expect(import('./env.js')).rejects.toThrow('Invalid SITES JSON format')
    })

    it('should throw error for non-array SITES', async () => {
      process.env.SITES = '{"not": "array"}'
      
      await expect(import('./env.js')).rejects.toThrow('SITES must be a JSON array of URLs')
    })

    it('should throw error for empty SITES array', async () => {
      process.env.SITES = '[]'
      
      await expect(import('./env.js')).rejects.toThrow('SITES array cannot be empty')
    })

    it('should throw error for non-string site URLs', async () => {
      process.env.SITES = '[123, "https://example.com"]'
      
      await expect(import('./env.js')).rejects.toThrow('Invalid site URL: 123 (must be string)')
    })

    it('should throw error for invalid URL format', async () => {
      process.env.SITES = '["not-a-url", "https://example.com"]'
      
      await expect(import('./env.js')).rejects.toThrow('Invalid site URL format: not-a-url')
    })

    it('should accept various valid URL formats', async () => {
      process.env.SITES = '["https://example.com", "http://test.org", "https://sub.domain.com:8080/path"]'
      
      const { config } = await import('./env.js')
      expect(config.sites).toHaveLength(3)
      expect(config.sites).toContain('https://example.com')
      expect(config.sites).toContain('http://test.org')
      expect(config.sites).toContain('https://sub.domain.com:8080/path')
    })
  })

  describe('Cron configuration', () => {
    beforeEach(() => {
      process.env.DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/123/abc'
      process.env.SITES = '["https://example.com"]'
    })

    it('should use default cron when not specified', async () => {
      delete process.env.CHECK_INTERVAL_CRON
      
      const { config } = await import('./env.js')
      expect(config.cron).toBe('*/1 * * * *')
    })

    it('should accept valid cron expression', async () => {
      process.env.CHECK_INTERVAL_CRON = '0 */5 * * *'
      
      const { config } = await import('./env.js')
      expect(config.cron).toBe('0 */5 * * *')
    })

    it('should throw error for invalid cron format', async () => {
      process.env.CHECK_INTERVAL_CRON = 'invalid-cron'
      
      await expect(import('./env.js')).rejects.toThrow('Invalid CHECK_INTERVAL_CRON format: invalid-cron')
    })

    it('should throw error for cron with wrong number of parts', async () => {
      process.env.CHECK_INTERVAL_CRON = '* * *'
      
      await expect(import('./env.js')).rejects.toThrow('Invalid CHECK_INTERVAL_CRON format: * * *')
    })
  })

  describe('Alert configuration', () => {
    beforeEach(() => {
      process.env.DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/123/abc'
      process.env.SITES = '["https://example.com"]'
    })

    it('should use default alert burst when not specified', async () => {
      delete process.env.ALERT_BURST
      
      const { config } = await import('./env.js')
      expect(config.alertBurst).toBe(3)
    })

    it('should parse valid alert burst value', async () => {
      process.env.ALERT_BURST = '5'
      
      const { config } = await import('./env.js')
      expect(config.alertBurst).toBe(5)
    })

    it('should throw error for zero alert burst', async () => {
      process.env.ALERT_BURST = '0'
      
      await expect(import('./env.js')).rejects.toThrow('ALERT_BURST must be a positive integer')
    })

    it('should throw error for negative alert burst', async () => {
      process.env.ALERT_BURST = '-1'
      
      await expect(import('./env.js')).rejects.toThrow('ALERT_BURST must be a positive integer')
    })

    it('should use default alert window when not specified', async () => {
      delete process.env.ALERT_WINDOW_SEC
      
      const { config } = await import('./env.js')
      expect(config.alertWindowSec).toBe(300)
    })

    it('should parse valid alert window value', async () => {
      process.env.ALERT_WINDOW_SEC = '600'
      
      const { config } = await import('./env.js')
      expect(config.alertWindowSec).toBe(600)
    })

    it('should throw error for zero alert window', async () => {
      process.env.ALERT_WINDOW_SEC = '0'
      
      await expect(import('./env.js')).rejects.toThrow('ALERT_WINDOW_SEC must be a positive integer')
    })

    it('should throw error for negative alert window', async () => {
      process.env.ALERT_WINDOW_SEC = '-1'
      
      await expect(import('./env.js')).rejects.toThrow('ALERT_WINDOW_SEC must be a positive integer')
    })
  })

  describe('Complete configuration', () => {
    it('should export complete config object with all values', async () => {
      process.env.DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/123/abc'
      process.env.SITES = '["https://example.com", "https://test.org"]'
      process.env.CHECK_INTERVAL_CRON = '*/5 * * * *'
      process.env.ALERT_BURST = '5'
      process.env.ALERT_WINDOW_SEC = '600'
      
      const { config } = await import('./env.js')
      
      expect(config).toEqual({
        discordWebhook: 'https://discord.com/api/webhooks/123/abc',
        sites: ['https://example.com', 'https://test.org'],
        cron: '*/5 * * * *',
        alertBurst: 5,
        alertWindowSec: 600
      })
    })
  })
})