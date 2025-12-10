import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { generateSampleToken } from '../../src/utils/jwt'
import { TokenData } from '../../api'

const bodySchema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user', 'guest']).optional(),
  permissions: z.array(z.string()).optional()
})

export const config: ApiRouteConfig = {
  name: 'GenerateToken',
  type: 'api',
  path: '/auth/token',
  method: 'POST',
  description: 'Generate a sample JWT token for testing (dev only)',
  emits: [],
  flows: ['jwt-auth-example'],
  bodySchema,
  responseSchema: {
    200: z.object({
      token: z.string(),
      decoded: z.object({
        userId: z.string(),
        email: z.string(),
        role: z.string(),
        permissions: z.array(z.string()),
        iat: z.number(),
        exp: z.number()
      }),
      usage: z.string()
    })
  }
}

export const handler: Handlers['GenerateToken'] = async (req, { logger }) => {
  const input = bodySchema.parse(req.body)
  
  const tokenData: Partial<TokenData> = {
    userId: input.userId || `user-${Date.now()}`,
    email: input.email || 'user@example.com',
    role: input.role || 'user',
    permissions: input.permissions || ['read:profile', 'write:profile']
  }
  
  const token = generateSampleToken(tokenData)
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600
  
  logger.info('Generated sample token', tokenData)
  
  return {
    status: 200,
    body: {
      token,
      decoded: {
        userId: tokenData.userId!,
        email: tokenData.email!,
        role: tokenData.role!,
        permissions: tokenData.permissions!,
        iat,
        exp
      },
      usage: `Use this token in Authorization header: "Bearer ${token}"`
    }
  }
}

