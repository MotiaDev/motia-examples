/**
 * Request Logger Middleware
 * 
 * Logs incoming requests and response times for observability.
 */

import { ApiMiddleware } from 'motia'

export const requestLoggerMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger } = ctx
  const startTime = Date.now()

  logger.info('Request received', {
    method: req.headers['x-http-method'] || 'unknown',
    path: Object.keys(req.pathParams).length > 0 ? req.pathParams : 'root',
    query: req.queryParams,
  })

  const response = await next()

  const duration = Date.now() - startTime

  logger.info('Request completed', {
    status: response.status,
    durationMs: duration,
  })

  // Add timing header
  if (!response.headers) {
    response.headers = {}
  }
  response.headers['X-Response-Time'] = `${duration}ms`

  return response
}

