import { ApiMiddleware } from 'motia'
import { ZodError } from 'zod'

/**
 * Core error handling middleware for the Planning Architecture backend.
 * 
 * Handles:
 * - Zod validation errors (400)
 * - General application errors (500)
 * - Structured logging for debugging
 */
export const errorHandlerMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger, traceId } = ctx

  try {
    return await next()
  } catch (error: any) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      logger.error('Validation error', {
        traceId,
        path: req.pathParams,
        errors: error.errors,
      })

      return {
        status: 400,
        body: {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      }
    }

    // Handle timeout errors
    if (error.message?.includes('timed out')) {
      logger.error('Request timeout', {
        traceId,
        error: error.message,
      })

      return {
        status: 504,
        body: {
          error: 'Request timed out',
          code: 'TIMEOUT_ERROR',
        },
      }
    }

    // Handle LLM API errors
    if (error.message?.includes('Gemini API')) {
      logger.error('LLM service error', {
        traceId,
        error: error.message,
      })

      return {
        status: 502,
        body: {
          error: 'AI planning service unavailable',
          code: 'LLM_ERROR',
        },
      }
    }

    // Handle general errors
    logger.error('Internal server error', {
      traceId,
      error: error.message,
      stack: error.stack,
    })

    return {
      status: 500,
      body: {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        traceId,
      },
    }
  }
}

