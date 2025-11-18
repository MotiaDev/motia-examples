import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../middlewares/auth.middleware'

export const config: ApiRouteConfig = {
  name: 'Profile',
  type: 'api',
  path: '/profile',
  method: 'GET',
  middleware: [authMiddleware],
  emits: [],
  flows: ['jwt-auth-example'],
  description: 'Get current user profile using JWT claims from middleware',
  responseSchema: {
    200: z.object({
      userId: z.string(),
      email: z.string(),
      role: z.string(),
      permissions: z.array(z.string()),
      message: z.string()
    })
  }
}

export const handler: Handlers['Profile'] = async (req, { logger }) => {
  const { tokenInfo } = req
  
  logger.info('Fetching profile', {
    userId: tokenInfo!.userId,
    role: tokenInfo!.role
  })
  
  return {
    status: 200,
    body: {
      userId: tokenInfo!.userId,
      email: tokenInfo!.email,
      role: tokenInfo!.role,
      permissions: tokenInfo!.permissions,
      message: 'Profile retrieved from JWT claims (verified once in middleware)'
    }
  }
}

