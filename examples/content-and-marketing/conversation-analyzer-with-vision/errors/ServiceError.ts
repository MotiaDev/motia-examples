/**
 * Base error class for step-related errors
 * Allows specifying status code and additional details
 */
export class ServiceError extends Error {
  status: number;
  details?: Record<string, any>;

  constructor(message: string, status: number = 500, details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
