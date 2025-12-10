/**
 * Core Middleware
 * 
 * Handles error catching, validation errors, and request logging
 * for all API steps in the app generator workflow.
 */

import type { ApiMiddleware } from 'motia';
import { ZodError } from 'zod';

export const coreMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger, traceId } = ctx;
  const startTime = Date.now();

  logger.info('Request received', {
    traceId,
    method: req.headers['x-http-method'] || 'UNKNOWN',
    path: req.headers['x-http-path'] || 'UNKNOWN',
  });

  try {
    const response = await next();
    
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      traceId,
      status: response.status,
      duration: `${duration}ms`,
    });

    // Add trace ID to response headers
    return {
      ...response,
      headers: {
        ...response.headers,
        'X-Trace-ID': traceId,
        'X-Response-Time': `${duration}ms`,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Check if it's a Zod validation error
    if (error instanceof ZodError || (error.name === 'ZodError' && Array.isArray(error.errors))) {
      logger.warn('Validation error', {
        traceId,
        errors: error.errors,
        duration: `${duration}ms`,
      });

      return {
        status: 400,
        headers: { 'X-Trace-ID': traceId },
        body: {
          error: 'Validation failed',
          details: error.errors?.map((e: any) => ({
            path: e.path?.join('.') || 'unknown',
            message: e.message || 'Unknown validation error',
          })) || [{ path: 'unknown', message: error.message }],
          traceId,
        },
      };
    }

    // Check for validation errors from Motia (which may wrap Zod errors differently)
    if (error.issues && Array.isArray(error.issues)) {
      logger.warn('Validation error (issues format)', {
        traceId,
        issues: error.issues,
        duration: `${duration}ms`,
      });

      return {
        status: 400,
        headers: { 'X-Trace-ID': traceId },
        body: {
          error: 'Validation failed',
          details: error.issues.map((e: any) => ({
            path: e.path?.join('.') || 'unknown',
            message: e.message || 'Unknown validation error',
          })),
          traceId,
        },
      };
    }

    logger.error('Request failed', {
      traceId,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });

    return {
      status: 500,
      headers: { 'X-Trace-ID': traceId },
      body: {
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
        traceId,
      },
    };
  }
};

