import { ApiMiddleware } from 'motia'
import { ZodError } from 'zod'

/**
 * Global error handler middleware
 * 
 * Handles Zod validation errors and other exceptions gracefully
 */
export const errorHandler: ApiMiddleware<any, any, any> = async (req, context, next) => {
  try {
    return await next()
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      context.logger.warn('Validation error', {
        errors: error.errors,
        path: req.pathParams
      })
      
      return {
        status: 400,
        body: {
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }
      }
    }
    
    // Handle generic errors
    context.logger.error('Unhandled error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return {
      status: 500,
      body: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }
  }
}

