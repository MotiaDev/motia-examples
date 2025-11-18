/**
 * Authentication Middleware
 * 
 * This middleware verifies JWT tokens and attaches decoded claims to the request object.
 * Once attached, handlers can access tokenInfo without re-verification.
 * 
 * Key Pattern:
 * - Middleware runs ONCE per request
 * - Verifies JWT and attaches claims to request.tokenInfo
 * - Handlers access request.tokenInfo directly (no re-verification needed)
 * - TypeScript knows about tokenInfo thanks to api.d.ts
 */

import { ApiMiddleware } from 'motia'
import { verifyToken, extractToken } from '../src/utils/jwt'

/**
 * Required Authentication Middleware
 * 
 * Requires a valid JWT token. Returns 401 if missing or invalid.
 * Attaches tokenInfo to request for use in handlers.
 * 
 * Usage in step config:
 * ```
 * import { authMiddleware } from '../../middlewares/auth.middleware'
 * middleware: [authMiddleware]
 * ```
 */
export const authMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger } = ctx
  
  // Extract token from Authorization header
  const token = extractToken(req.headers.authorization as string | undefined)
  
  if (!token) {
    return {
      status: 401,
      body: {
        error: 'Unauthorized',
        message: 'No authentication token provided'
      }
    }
  }
  
  // Verify and decode token
  const tokenData = await verifyToken(token)
  
  if (!tokenData) {
    return {
      status: 401,
      body: {
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      }
    }
  }
  
  // Attach token data to request
  // These properties are now available in all handlers!
  req.tokenInfo = tokenData
  req.userId = tokenData.userId
  req.isAuthenticated = true
  
  // Log authentication for debugging
  logger.info('Request authenticated', {
    userId: tokenData.userId,
    role: tokenData.role
  })
  
  // Continue to next middleware or handler
  return await next()
}

