/**
 * Error Handler Middleware
 * Catches and handles errors consistently across all API endpoints
 */

import { ApiMiddleware } from 'motia';
import { ZodError } from 'zod';

export const errorHandlerMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger } = ctx;

  try {
    return await next();
  } catch (error: any) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      logger.error('Validation error', {
        errors: error.errors,
        path: req.pathParams,
      });

      return {
        status: 400,
        body: {
          error: 'Validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        }
      };
    }

    // Handle other errors
    logger.error('Request processing error', {
      error: error.message,
      stack: error.stack,
      path: req.pathParams,
    });

    return {
      status: 500,
      body: { 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message
      }
    };
  }
};

