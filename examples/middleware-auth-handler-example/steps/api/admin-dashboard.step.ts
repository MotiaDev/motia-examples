import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { requireRole } from '../../middlewares/require-role.middleware'

export const config: ApiRouteConfig = {
  name: 'AdminDashboard',
  type: 'api',
  path: '/admin/dashboard',
  method: 'GET',
  middleware: [authMiddleware, requireRole('admin')],
  emits: [],
  flows: ['jwt-auth-example'],
  description: 'Admin-only endpoint that uses JWT claims',
  responseSchema: {
    200: z.object({
      message: z.string(),
      adminUser: z.object({
        userId: z.string(),
        email: z.string(),
        role: z.string()
      }),
      data: z.object({
        totalUsers: z.number(),
        activeUsers: z.number(),
        recentSignups: z.number()
      })
    })
  }
}

export const handler: Handlers['AdminDashboard'] = async (req, { logger }) => {
  const { tokenInfo } = req
  
  logger.info('Admin accessing dashboard', {
    userId: tokenInfo!.userId,
    role: tokenInfo!.role
  })
  
  const dashboardData = {
    totalUsers: 1234,
    activeUsers: 567,
    recentSignups: 89
  }
  
  return {
    status: 200,
    body: {
      message: 'Admin dashboard data',
      adminUser: {
        userId: tokenInfo!.userId,
        email: tokenInfo!.email,
        role: tokenInfo!.role
      },
      data: dashboardData
    }
  }
}

