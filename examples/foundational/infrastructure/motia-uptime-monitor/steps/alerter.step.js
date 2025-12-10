import { z } from 'zod'
import { getPreviousStatus } from '../lib/streams.js'
import { createRateLimiter } from '../lib/rate-limiter.js'
import { config as envConfig } from '../lib/env.js'

// Create a rate limiter instance for Discord alerts
const rateLimiter = createRateLimiter({
  burst: envConfig.alertBurst,
  windowSec: envConfig.alertWindowSec
})

export const config = {
  type: 'event',
  name: 'DiscordAlerter',
  description: 'Sends Discord notifications when website status changes',

  /**
   * This step subscribes to 'check.result' events from the checker
   */
  subscribes: ['check.result'],

  /**
   * This step doesn't emit any events
   */
  emits: [],

  /**
   * Expected input schema matching check result structure
   */
  input: z.object({
    url: z.string().url(),
    status: z.enum(['UP', 'DOWN']),
    code: z.number().nullable(),
    responseTime: z.number(),
    checkedAt: z.string(),
    error: z.string().nullable()
  }),

  /**
   * The flows this step belongs to
   */
  flows: ['uptime-monitoring'],
}

/**
 * Creates a formatted Discord message for status changes
 * @param {Object} result - Check result object
 * @param {string} previousStatus - Previous status (UP/DOWN)
 * @returns {Object} - Discord webhook payload
 */
function createDiscordMessage(result, previousStatus) {
  const { url, status, code, responseTime, checkedAt, error } = result

  // Determine message color and emoji
  const isUp = status === 'UP'
  const emoji = isUp ? '🟢' : '🔴'
  const color = isUp ? 0x00ff00 : 0xff0000 // Green for UP, Red for DOWN

  // Create main message content
  const content = `${emoji} ${url} is ${status}${code ? ` (${code})` : ''}`

  // Build embed fields
  const fields = [
    {
      name: 'Response Time',
      value: `${responseTime}ms`,
      inline: true
    }
  ]

  if (code !== null) {
    fields.push({
      name: 'Status Code',
      value: code.toString(),
      inline: true
    })
  }

  if (error) {
    fields.push({
      name: 'Error',
      value: error,
      inline: false
    })
  }

  fields.push({
    name: 'Previous Status',
    value: previousStatus,
    inline: true
  })

  return {
    content,
    embeds: [{
      title: `Website Status Change: ${status}`,
      description: `${url} changed from ${previousStatus} to ${status}`,
      color,
      timestamp: checkedAt,
      fields
    }]
  }
}

/**
 * Sends a Discord webhook notification
 * @param {Object} message - Discord message payload
 * @param {Object} logger - Logger instance
 * @returns {Promise<boolean>} - True if successful
 */
async function sendDiscordWebhook(message, logger) {
  try {
    const response = await fetch(envConfig.discordWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Motia-Uptime-Monitor/1.0'
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    logger.info('Discord webhook sent successfully', {
      status: response.status,
      url: message.embeds[0]?.description || 'Unknown URL'
    })

    return true

  } catch (error) {
    logger.error('Failed to send Discord webhook', {
      error: error.message,
      webhookUrl: envConfig.discordWebhook.substring(0, 50) + '...' // Log partial URL for debugging
    })

    return false
  }
}

export const handler = async (input, { logger }) => {
  logger.info('🚨 ALERTER: Handler called!', {
    input: input,
    inputType: typeof input,
    inputKeys: Object.keys(input || {}),
    hasUrl: !!input?.url,
    hasStatus: !!input?.status
  })

  logger.info('🚨 ALERTER: Raw input received:', {
    input: input,
    inputType: typeof input,
    inputKeys: Object.keys(input || {}),
    inputStringified: JSON.stringify(input, null, 2)
  });

  const { url, status, code, responseTime, checkedAt, error } = input

  logger.info('🚨 ALERTER: Extracted values:', {
    url: url,
    urlType: typeof url,
    status: status,
    statusType: typeof status,
    hasUrl: !!url,
    hasStatus: !!status
  })

  // Get the previous status for this site
  logger.info('🚨 ALERTER: About to call getPreviousStatus', {
    url: url,
    urlType: typeof url,
    urlValue: JSON.stringify(url)
  });

  let previousResult;
  try {
    previousResult = getPreviousStatus(url);
    logger.info('🚨 ALERTER: getPreviousStatus result', {
      url: url,
      hasPreviousResult: !!previousResult,
      previousResult: previousResult
    });

    // Let's also check what's in the status store
    const { getSnapshot } = await import('../lib/streams.js');
    const allStatuses = getSnapshot();
    logger.info('🚨 ALERTER: Current status store contents', {
      storeKeys: Object.keys(allStatuses),
      storeSize: Object.keys(allStatuses).length,
      allStatuses: allStatuses,
      queryingUrl: url
    });
  } catch (getPrevError) {
    logger.error('🚨 ALERTER: Error calling getPreviousStatus', {
      url: url,
      error: getPrevError.message,
      stack: getPrevError.stack
    });
    return;
  }

  // Handle first-time checks (no previous status)
  if (!previousResult) {
    logger.info('🚨 ALERTER: First-time check for site, no alert needed', { url, status })

    // Store the current status for next time (first-time check)
    const { updateLastStatus } = await import('../lib/streams.js');
    updateLastStatus(input);
    logger.info('🚨 ALERTER: Stored first-time status for future comparisons');
    return
  }

  const previousStatus = previousResult.status

  logger.info('🚨 ALERTER: Comparing statuses', {
    url,
    currentStatus: status,
    previousStatus: previousStatus,
    hasChanged: status !== previousStatus
  });

  // Only trigger alerts when status actually changes
  if (status === previousStatus) {
    logger.debug('🚨 ALERTER: Status unchanged, no alert needed', { url, status, previousStatus })

    // Update the status store with current check (same status, but newer timestamp)
    const { updateLastStatus } = await import('../lib/streams.js');
    updateLastStatus(input);
    return
  }

  // Status has changed - log the transition
  logger.info('🚨 ALERTER: Status change detected', {
    url,
    previousStatus,
    newStatus: status,
    transition: `${previousStatus} → ${status}`
  })

  // Check rate limiting before sending alert
  logger.info('🚨 ALERTER: About to check rate limiting', { url, status });

  if (!rateLimiter.consume(url)) {
    const timeUntilNext = rateLimiter.getTimeUntilNextToken(url)
    logger.warn('🚨 ALERTER: Alert rate limited', {
      url,
      status,
      previousStatus,
      timeUntilNextMs: timeUntilNext,
      tokensRemaining: rateLimiter.getTokenCount(url)
    })
    return
  }

  logger.info('🚨 ALERTER: Rate limiting passed, proceeding with Discord alert', { url, status });

  logger.info('🚨 ALERTER: Sending Discord alert', {
    url,
    status,
    previousStatus,
    tokensRemaining: rateLimiter.getTokenCount(url)
  })

  // Create and send Discord message
  const message = createDiscordMessage(input, previousStatus)
  const success = await sendDiscordWebhook(message, logger)

  if (success) {
    logger.info('Discord alert sent successfully', { url, status, previousStatus })
  } else {
    logger.error('Failed to send Discord alert', { url, status, previousStatus })
  }

  // CRITICAL: Update the status store AFTER sending the alert
  // This ensures the next check will have the correct previous status
  const { updateLastStatus } = await import('../lib/streams.js');
  updateLastStatus(input);
  logger.info('🚨 ALERTER: Updated status store after sending alert', {
    url,
    newStatus: status,
    previousStatus
  });
}