/**
 * Error Handling Middleware
 * 
 * Centralized error handling for ContractGPT API steps.
 * Handles Zod validation errors, API errors, and unexpected exceptions.
 */

import { ApiMiddleware } from 'motia'
import { ZodError } from 'zod'

export const errorHandlerMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger } = ctx

  try {
    return await next()
  } catch (error: any) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      logger.warn('Validation error', {
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

    // Handle known API errors
    if (error.statusCode && error.code) {
      logger.error('API error', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      })

      return {
        status: error.statusCode,
        body: {
          error: error.message,
          code: error.code,
        },
      }
    }

    // Handle Gemini API errors
    if (error.message?.includes('GEMINI') || error.message?.includes('API key')) {
      logger.error('Gemini API error', {
        message: error.message,
        stack: error.stack,
      })

      return {
        status: 503,
        body: {
          error: 'AI service temporarily unavailable',
          code: 'AI_SERVICE_ERROR',
        },
      }
    }

    // Handle unexpected errors
    logger.error('Unexpected error', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    })

    return {
      status: 500,
      body: {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    }
  }
}

/**
 * Create a custom API error
 */
export class ApiError extends Error {
  statusCode: number
  code: string

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
  }
}

export const NotFoundError = (resource: string, id: string) =>
  new ApiError(`${resource} not found: ${id}`, 'NOT_FOUND', 404)

export const BadRequestError = (message: string) =>
  new ApiError(message, 'BAD_REQUEST', 400)

export const UnauthorizedError = (message: string = 'Unauthorized') =>
  new ApiError(message, 'UNAUTHORIZED', 401)


