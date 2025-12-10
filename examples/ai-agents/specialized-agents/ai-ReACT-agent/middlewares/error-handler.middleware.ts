/**
 * Error Handler Middleware
 * 
 * Catches and handles errors in API step handlers:
 * - ZodError for validation failures
 * - General errors with proper logging
 */

import { ApiMiddleware } from 'motia'
import { ZodError } from 'zod'

export const errorHandlerMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger } = ctx

  try {
    return await next()
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      logger.error('Validation error', {
        errors: error.errors,
        path: req.pathParams,
      })

      return {
        status: 400,
        body: {
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      }
    }

    logger.error('Request handler error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      path: req.pathParams,
    })

    return {
      status: 500,
      body: { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    }
  }
}

