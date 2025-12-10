/**
 * TypeScript Module Augmentation for Motia API Requests
 * 
 * This file extends the ApiRequest interface to include custom properties
 * that can be set by middlewares and accessed by handlers.
 * 
 * By declaring this module augmentation, TypeScript will recognize
 * additional properties on the request object throughout your application.
 */

import { ApiRequest } from 'motia'

/**
 * JWT Token Claims
 * These are the decoded claims from a verified JWT token
 */
export interface TokenData {
  userId: string
  email: string
  role: 'admin' | 'user' | 'guest'
  permissions: string[]
  iat: number  // Issued at timestamp
  exp: number  // Expiration timestamp
}

/**
 * Extend the Motia ApiRequest interface
 * This makes tokenInfo available on all API requests with proper typing
 */
declare module 'motia' {
  interface ApiRequest<TBody = unknown> {
    /**
     * JWT token claims attached by auth middleware
     * Will be undefined if no valid token was provided or if auth middleware hasn't run
     */
    tokenInfo?: TokenData
    
    /**
     * User ID extracted from token (convenience property)
     * Available after auth middleware runs
     */
    userId?: string
    
    /**
     * Indicates whether the request has been authenticated
     */
    isAuthenticated?: boolean
  }
}

