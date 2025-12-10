import { ZodSchema, ZodError } from 'zod';
import { ApiRouteHandler, ApiRequest, FlowContext, ApiResponse } from 'motia';
import { BadRequestError } from '../errors/BadRequestError';

/**
 * Middleware to validate API request body against a Zod schema
 * @param schema The Zod schema to validate against
 * @returns A middleware function that validates the request body before passing to the handler
 */
export function withValidation<T extends Record<string, any>>(schema: ZodSchema<T>) {
  return (handler: ApiRouteHandler): ApiRouteHandler => {
    return async (req: ApiRequest, context: FlowContext): Promise<ApiResponse> => {
      try {
        const validatedBody = schema.parse(req.body);
        const validatedReq: ApiRequest = {
          ...req,
          body: validatedBody,
        };

        return await handler(validatedReq, context);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new BadRequestError('Validation failed', {
            errors: error.errors,
          });
        }

        throw error;
      }
    };
  };
}
