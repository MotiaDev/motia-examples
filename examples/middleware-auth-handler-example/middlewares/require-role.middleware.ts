/**
 * Role-Based Authorization Middleware
 * 
 * This middleware checks if the authenticated user has a required role.
 * Must be used AFTER auth middleware.
 * 
 * Demonstrates how middlewares can build on each other using shared request properties.
 */

import { ApiMiddleware } from 'motia'
import { TokenData } from '../api'

/**
 * Create a middleware that requires a specific role
 * 
 * @param requiredRole - The role required to access the endpoint
 * @returns Middleware handler
 * 
 * Usage in step config:
 * ```
 * import { authMiddleware } from './auth.middleware'
 * import { requireRole } from './require-role.middleware'
 * middleware: [authMiddleware, requireRole('admin')]
 * ```
 */
export function requireRole(requiredRole: TokenData['role']): ApiMiddleware {
  return async (req, ctx, next) => {
    const { logger } = ctx
    
    // Check if tokenInfo exists (auth middleware should have set it)
    if (!req.tokenInfo) {
      return {
        status: 401,
        body: {
          error: 'Unauthorized',
          message: 'Authentication required'
        }
      }
    }
    
    // Check if user has required role
    if (req.tokenInfo.role !== requiredRole) {
      logger.warn('Role check failed', {
        userId: req.tokenInfo.userId,
        required: requiredRole,
        actual: req.tokenInfo.role
      })
      
      return {
        status: 403,
        body: {
          error: 'Forbidden',
          message: `This endpoint requires ${requiredRole} role`
        }
      }
    }
    
    logger.info('Role check passed', {
      userId: req.tokenInfo.userId,
      role: req.tokenInfo.role
    })
    
    // Continue to next middleware or handler
    return await next()
  }
}

/**
 * Check if user has any of the allowed roles
 * 
 * @param allowedRoles - Array of allowed roles
 * @returns Middleware handler
 */
export function requireAnyRole(allowedRoles: TokenData['role'][]): ApiMiddleware {
  return async (req, ctx, next) => {
    const { logger } = ctx
    
    if (!req.tokenInfo) {
      return {
        status: 401,
        body: {
          error: 'Unauthorized',
          message: 'Authentication required'
        }
      }
    }
    
    if (!allowedRoles.includes(req.tokenInfo.role)) {
      return {
        status: 403,
        body: {
          error: 'Forbidden',
          message: `This endpoint requires one of these roles: ${allowedRoles.join(', ')}`
        }
      }
    }
    
    return await next()
  }
}

