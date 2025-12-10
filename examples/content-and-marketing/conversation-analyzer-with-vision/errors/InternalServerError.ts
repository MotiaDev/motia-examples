import { ServiceError } from './ServiceError';

/**
 * Error for internal server errors (500)
 */
export class InternalServerError extends ServiceError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 500, details);
  }
}
