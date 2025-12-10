import { z } from 'zod'
import { getSnapshot } from '../lib/streams.js'
import { config as envConfig } from '../lib/env.js'

export const config = {
  type: 'api',
  name: 'HealthCheck',
  description: 'Provides system health status endpoint',

  /**
   * HTTP method and path configuration
   */
  method: 'GET',
  path: '/healthz',

  /**
   * This step doesn't emit any events
   */
  emits: [],

  /**
   * Response schema definition
   */
  responseSchema: {
    200: z.object({
      status: z.literal('ok'),
      sitesConfigured: z.number(),
      lastKnown: z.record(z.any()),
      now: z.string()
    })
  },

  /**
   * The flows this step belongs to
   */
  flows: ['uptime-monitoring'],
}

export const handler = async (_, { logger }) => {
  logger.info('Health check endpoint accessed')
  
  try {
    // Get current timestamp in ISO8601 format
    const now = new Date().toISOString()
    
    // Get count of configured sites from environment
    const sitesConfigured = envConfig.sites.length
    
    // Get last known status for all sites
    const lastKnown = getSnapshot()
    
    const response = {
      status: 'ok',
      sitesConfigured,
      lastKnown,
      now
    }
    
    logger.info('Health check completed successfully', { 
      sitesConfigured,
      sitesWithStatus: Object.keys(lastKnown).length
    })
    
    return {
      status: 200,
      body: response
    }
    
  } catch (error) {
    logger.error('Health check failed', { 
      error: error.message,
      stack: error.stack
    })
    
    // Even if there's an error, we should still return a 200 status
    // as the system is operational enough to respond
    return {
      status: 200,
      body: {
        status: 'ok',
        sitesConfigured: 0,
        lastKnown: {},
        now: new Date().toISOString(),
        error: error.message
      }
    }
  }
}