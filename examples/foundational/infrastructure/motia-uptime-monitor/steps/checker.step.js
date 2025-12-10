import { z } from 'zod'

export const config = {
  type: 'event',
  name: 'WebsiteChecker',
  description: 'Performs HTTP checks on websites and emits results',

  /**
   * This step subscribes to 'check.requested' events
   */
  subscribes: ['check.requested'],

  /**
   * This step emits to both 'check.result' and 'status.stream' topics
   */
  emits: ['check.result', 'status.stream'],

  /**
   * Expected input schema with URL validation
   */
  input: z.object({
    url: z.string().url('Must be a valid URL')
  }),

  /**
   * The flows this step belongs to
   */
  flows: ['uptime-monitoring'],
}

export const handler = async (input, { logger, emit }) => {
  logger.info('🔍 CHECKER: Handler called!', {
    input: input,
    inputType: typeof input,
    inputKeys: Object.keys(input || {}),
    hasUrl: !!input?.url,
    inputStringified: JSON.stringify(input, null, 2)
  })

  const { url } = input

  logger.info('🔍 CHECKER: Extracted URL:', { 
    url: url,
    urlType: typeof url,
    urlLength: url?.length,
    hasUrl: !!url
  })

  logger.info('🔍 CHECKER: Starting website check', { url, inputReceived: !!input })

  const startTime = performance.now()
  let result

  try {
    // Validate URL format before making request
    const urlObj = new URL(url)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are supported')
    }

    // Perform HTTP request with timeout handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Motia-Uptime-Monitor/1.0',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      },
      // Don't follow redirects automatically to get accurate response codes
      redirect: 'manual'
    })

    clearTimeout(timeoutId)
    const endTime = performance.now()
    const responseTime = Math.round(endTime - startTime)

    // Determine status based on HTTP response
    // Consider 2xx and 3xx as UP, everything else as DOWN
    const status = (response.status >= 200 && response.status < 400) ? 'UP' : 'DOWN'

    result = {
      url,
      status,
      code: response.status,
      responseTime,
      checkedAt: new Date().toISOString(),
      error: null
    }

    logger.info('Website check completed', {
      url,
      status,
      code: response.status,
      responseTime
    })

  } catch (error) {
    const endTime = performance.now()
    const responseTime = Math.round(endTime - startTime)

    let errorMessage = error.message

    // Handle specific error types with more detailed messages
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout (10s)'
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Network error - unable to connect'
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'DNS resolution failed'
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused'
    } else if (error.code === 'ECONNRESET') {
      errorMessage = 'Connection reset by peer'
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout'
    } else if (error.code === 'CERT_HAS_EXPIRED') {
      errorMessage = 'SSL certificate expired'
    } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      errorMessage = 'SSL certificate verification failed'
    }

    result = {
      url,
      status: 'DOWN',
      code: null,
      responseTime,
      checkedAt: new Date().toISOString(),
      error: errorMessage
    }

    logger.error('Website check failed', {
      url,
      error: errorMessage,
      responseTime,
      originalError: error.code || error.name
    })
  }

  logger.info('🔍 CHECKER: About to update status store and emit results', { url, status: result.status });

  try {
    // Update the in-memory status store
    logger.info('🔍 CHECKER: Updating status store');
    logger.info('🔍 CHECKER: Result object:', { result });

    // Status store will be updated by the alerter step after comparison
    logger.info('🔍 CHECKER: Skipping status store update - will be handled by alerter');

    // Emit to check.result topic for alerter
    try {
      logger.info('🔍 CHECKER: Emitting check.result for alerter', { url, status: result.status });
      logger.info('🔍 CHECKER: About to call emit with:', { topic: 'check.result', result });
      await emit({ topic: 'check.result',  data:result });
      logger.info('🔍 CHECKER: Successfully emitted check.result');
    } catch (checkResultError) {
      logger.error('🔍 CHECKER: Failed to emit check.result', {
        error: checkResultError.message,
        stack: checkResultError.stack
      });
    }

    // Emit to status.stream topic for dashboard
    try {
      logger.info('🔍 CHECKER: Emitting status.stream for dashboard', { url, status: result.status });
      
      await emit({ topic: 'status.stream',  data:result })
      logger.info('🔍 CHECKER: Successfully emitted status.stream');
    } catch (statusStreamError) {
      logger.error('🔍 CHECKER: Failed to emit status.stream', {
        error: statusStreamError.message,
        stack: statusStreamError.stack
      });
    }

    logger.info('🔍 CHECKER: All operations completed successfully', { url, status: result.status });
  } catch (emitError) {
    logger.error('🔍 CHECKER: Error in post-check operations', {
      url,
      error: emitError.message,
      stack: emitError.stack
    });
    // Don't throw - we want to continue even if emit fails
  }
}