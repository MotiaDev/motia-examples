import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { requirePermission } from '../../middlewares/require-permission.middleware'

const bodySchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional()
})

export const config: ApiRouteConfig = {
  name: 'UpdateUser',
  type: 'api',
  path: '/users/:userId',
  method: 'PUT',
  middleware: [authMiddleware, requirePermission('write:users')],
  emits: [],
  flows: ['jwt-auth-example'],
  description: 'Update user - requires write:users permission',
  bodySchema,
  responseSchema: {
    200: z.object({
      message: z.string(),
      updatedBy: z.object({
        userId: z.string(),
        email: z.string(),
        role: z.string()
      })
    }),
    403: z.object({
      error: z.string(),
      message: z.string()
    })
  }
}

export const handler: Handlers['UpdateUser'] = async (req, { logger }) => {
  const { tokenInfo, pathParams, body } = req
  const { userId } = pathParams
  const { name, email } = bodySchema.parse(body)
  
  logger.info('User update requested', {
    targetUserId: userId,
    requestedBy: tokenInfo!.userId,
    permissions: tokenInfo!.permissions
  })
  
  const isSelfUpdate = tokenInfo!.userId === userId
  const isAdmin = tokenInfo!.role === 'admin'
  
  if (!isSelfUpdate && !isAdmin) {
    return {
      status: 403,
      body: {
        error: 'Forbidden',
        message: 'You can only update your own profile'
      }
    }
  }
  
  logger.info('Updating user', { userId, name, email })
  
  return {
    status: 200,
    body: {
      message: `User ${userId} updated successfully`,
      updatedBy: {
        userId: tokenInfo!.userId,
        email: tokenInfo!.email,
        role: tokenInfo!.role
      }
    }
  }
}

