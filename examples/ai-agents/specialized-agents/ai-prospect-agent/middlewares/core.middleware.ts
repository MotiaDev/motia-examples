/**
 * Core Middleware - Error Handling and Logging
 * Applied to all API steps for consistent error handling
 */
import { ApiMiddleware } from 'motia'
import { ZodError } from 'zod'

export const coreMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger } = ctx

  try {
    logger.info('Request started', {
      path: req.pathParams,
      method: 'API',
    })

    const response = await next()

    logger.info('Request completed', {
      status: response.status,
    })

    return response
  } catch (error: any) {
    if (error instanceof ZodError) {
      logger.warn('Validation error', {
        errors: error.errors,
      })

      return {
        status: 400,
        body: {
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      }
    }

    logger.error('Request failed', {
      error: error.message,
      stack: error.stack,
    })

    return {
      status: 500,
      body: { error: 'Internal Server Error', message: error.message },
    }
  }
}

export const corsMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const response = await next()

  return {
    ...response,
    headers: {
      ...response.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  }
}

