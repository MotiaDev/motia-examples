/**
 * Error Handler Middleware
 * Handles errors and Zod validation failures gracefully
 */

import { ApiMiddleware } from 'motia';
import { ZodError } from 'zod';

export const errorHandlerMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger } = ctx;

  try {
    return await next();
  } catch (error: unknown) {
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
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      };
    }

    // Handle known errors with status codes
    if (error instanceof Error && 'statusCode' in error) {
      const statusCode = (error as Error & { statusCode: number }).statusCode;
      logger.error('HTTP error', {
        statusCode,
        message: error.message,
      });

      return {
        status: statusCode,
        body: { error: error.message },
      };
    }

    // Handle unknown errors
    logger.error('Unhandled error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      status: 500,
      body: { error: 'Internal server error' },
    };
  }
};

