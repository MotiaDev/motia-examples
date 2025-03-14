import { ServiceError } from './ServiceError';

/**
 * Error for bad requests (400)
 */
export class BadRequestError extends ServiceError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, details);
  }
}
