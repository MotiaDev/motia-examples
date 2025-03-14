import { ServiceError } from '../errors/ServiceError';
import {
  ApiRequest,
  ApiResponse,
  ApiRouteHandler,
  CronHandler,
  EventHandler,
  FlowContext,
} from '@motiadev/core';
import { ZodObject } from 'zod';

/**
 * Middleware to handle errors in API handlers
 * @param handler The API handler function to wrap
 * @returns A wrapped API handler function with error handling
 */
export function withApiErrorHandler(handler: ApiRouteHandler): ApiRouteHandler {
  return async (req: ApiRequest, context: FlowContext): Promise<ApiResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      context.logger.error('Error in API handler', error);

      if (error instanceof ServiceError) {
        return {
          status: error.status,
          body: {
            error: error.message,
            ...(error.details && { details: error.details }),
          },
        };
      }

      return {
        status: 500,
        body: {
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  };
}
