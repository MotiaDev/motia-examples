import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { optionalAuthMiddleware } from '../../middlewares/optional-auth.middleware'

export const config: ApiRouteConfig = {
  name: 'PublicContent',
  type: 'api',
  path: '/content',
  method: 'GET',
  middleware: [optionalAuthMiddleware],
  emits: [],
  flows: ['jwt-auth-example'],
  description: 'Get content - enhanced for authenticated users',
  responseSchema: {
    200: z.object({
      content: z.array(z.object({
        id: z.number(),
        title: z.string(),
        text: z.string(),
        premium: z.boolean().optional()
      })),
      userContext: z.object({
        authenticated: z.boolean(),
        userId: z.string().optional(),
        role: z.string().optional(),
        message: z.string()
      })
    })
  }
}

export const handler: Handlers['PublicContent'] = async (req, { logger }) => {
  const { tokenInfo, isAuthenticated } = req
  
  if (isAuthenticated && tokenInfo) {
    logger.info('Authenticated user accessing content', {
      userId: tokenInfo.userId,
      role: tokenInfo.role
    })
    
    return {
      status: 200,
      body: {
        content: [
          { id: 1, title: 'Public Article 1', text: 'Full content...', premium: false },
          { id: 2, title: 'Public Article 2', text: 'Full content...', premium: false },
          { id: 3, title: 'Premium Article', text: 'Premium content...', premium: true }
        ],
        userContext: {
          authenticated: true,
          userId: tokenInfo.userId,
          role: tokenInfo.role,
          message: 'Enhanced content for authenticated users'
        }
      }
    }
  } else {
    logger.info('Anonymous user accessing content')
    
    return {
      status: 200,
      body: {
        content: [
          { id: 1, title: 'Public Article 1', text: 'Preview only...', premium: false },
          { id: 2, title: 'Public Article 2', text: 'Preview only...', premium: false }
        ],
        userContext: {
          authenticated: false,
          message: 'Sign in for full content access'
        }
      }
    }
  }
}

