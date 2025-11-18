/**
 * Permission-Based Authorization Middleware
 * 
 * This middleware checks if the authenticated user has required permissions.
 * Must be used AFTER auth middleware.
 * 
 * Demonstrates fine-grained access control using permissions.
 */

import { ApiMiddleware } from 'motia'

/**
 * Create a middleware that requires specific permission(s)
 * 
 * @param permissions - Permission(s) required to access the endpoint
 * @returns Middleware handler
 * 
 * Usage in step config:
 * ```
 * import { authMiddleware } from './auth.middleware'
 * import { requirePermission } from './require-permission.middleware'
 * middleware: [authMiddleware, requirePermission('write:users')]
 * middleware: [authMiddleware, requirePermission(['read:users', 'write:users'])]
 * ```
 */
export function requirePermission(
  permissions: string | string[]
): ApiMiddleware {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions]
  
  return async (req, ctx, next) => {
    const { logger } = ctx
    
    // Check if tokenInfo exists
    if (!req.tokenInfo) {
      return {
        status: 401,
        body: {
          error: 'Unauthorized',
          message: 'Authentication required'
        }
      }
    }
    
    // Check if user has all required permissions
    const userPermissions = req.tokenInfo.permissions || []
    const hasAllPermissions = requiredPermissions.every(
      perm => userPermissions.includes(perm)
    )
    
    if (!hasAllPermissions) {
      const missing = requiredPermissions.filter(
        perm => !userPermissions.includes(perm)
      )
      
      logger.warn('Permission check failed', {
        userId: req.tokenInfo.userId,
        required: requiredPermissions,
        missing
      })
      
      return {
        status: 403,
        body: {
          error: 'Forbidden',
          message: 'Insufficient permissions',
          required: requiredPermissions
        }
      }
    }
    
    logger.info('Permission check passed', {
      userId: req.tokenInfo.userId,
      permissions: requiredPermissions
    })
    
    return await next()
  }
}

/**
 * Check if user has any of the specified permissions
 * 
 * @param permissions - Array of permissions (user needs at least one)
 * @returns Middleware handler
 */
export function requireAnyPermission(permissions: string[]): ApiMiddleware {
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
    
    const userPermissions = req.tokenInfo.permissions || []
    const hasAnyPermission = permissions.some(
      perm => userPermissions.includes(perm)
    )
    
    if (!hasAnyPermission) {
      return {
        status: 403,
        body: {
          error: 'Forbidden',
          message: `Requires at least one of: ${permissions.join(', ')}`
        }
      }
    }
    
    return await next()
  }
}

