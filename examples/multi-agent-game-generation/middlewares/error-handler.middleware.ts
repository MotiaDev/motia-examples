/**
 * Error Handling Middleware
 * Handles all errors gracefully with proper logging and user-friendly responses
 */
import { ApiMiddleware } from 'motia'
import { ZodError } from 'zod'

export const errorHandlerMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger, traceId } = ctx

  try {
    return await next()
  } catch (error: any) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      logger.warn('Validation error', {
        traceId,
        errors: error.errors,
        path: req.pathParams,
      })

      return {
        status: 400,
        body: {
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          traceId,
        },
      }
    }

    // Handle Gemini API errors
    if (error.message?.includes('GEMINI_API_KEY')) {
      logger.error('Gemini API configuration error', {
        traceId,
        error: error.message,
      })

      return {
        status: 503,
        body: {
          error: 'AI service not configured',
          message: 'Please set the GEMINI_API_KEY environment variable',
          traceId,
        },
      }
    }

    // Handle JSON parsing errors from AI responses
    if (error.message?.includes('Failed to parse')) {
      logger.error('AI response parsing error', {
        traceId,
        error: error.message,
      })

      return {
        status: 502,
        body: {
          error: 'AI service returned invalid response',
          message: 'The AI model returned an unexpected format. Please try again.',
          traceId,
        },
      }
    }

    // Handle all other errors
    logger.error('Unexpected error', {
      traceId,
      error: error.message,
      stack: error.stack,
      body: req.body,
    })

    return {
      status: 500,
      body: {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
        traceId,
      },
    }
  }
}

