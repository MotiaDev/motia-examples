/**
 * Optional Authentication Middleware
 * 
 * Similar to auth middleware, but doesn't require authentication.
 * If a valid token is provided, it attaches tokenInfo to request.
 * If no token or invalid token, request continues without tokenInfo.
 * 
 * Useful for endpoints that work differently for authenticated vs anonymous users.
 */

import { ApiMiddleware } from 'motia'
import { verifyToken, extractToken } from '../src/utils/jwt'

/**
 * Optional Authentication Middleware
 * 
 * Usage in step config:
 * ```
 * import { optionalAuthMiddleware } from '../../middlewares/optional-auth.middleware'
 * middleware: [optionalAuthMiddleware]
 * ```
 */
export const optionalAuthMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger } = ctx
  
  // Extract token from Authorization header
  const token = extractToken(req.headers.authorization as string | undefined)
  
  if (token) {
    // Verify and decode token
    const tokenData = await verifyToken(token)
    
    if (tokenData) {
      // Attach token data to request
      req.tokenInfo = tokenData
      req.userId = tokenData.userId
      req.isAuthenticated = true
      
      logger.info('Request authenticated', {
        userId: tokenData.userId,
        role: tokenData.role
      })
    } else {
      // Invalid token, but don't block the request
      req.isAuthenticated = false
      logger.warn('Invalid token provided, continuing as anonymous')
    }
  } else {
    // No token provided, continue as anonymous
    req.isAuthenticated = false
  }
  
  // Always continue to handler
  return await next()
}

