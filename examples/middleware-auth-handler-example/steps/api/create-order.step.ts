import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../middlewares/auth.middleware'

const bodySchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive()
})

export const config: ApiRouteConfig = {
  name: 'CreateOrder',
  type: 'api',
  path: '/orders',
  method: 'POST',
  middleware: [authMiddleware],
  description: 'Create order - passes user context to event handlers',
  bodySchema,
  responseSchema: {
    201: z.object({
      orderId: z.string(),
      status: z.string(),
      message: z.string()
    })
  },
  emits: ['order.created'],
  flows: ['jwt-auth-example']
}

export const handler: Handlers['CreateOrder'] = async (req, { logger, emit }) => {
  const { tokenInfo, body } = req
  const { productId, quantity } = bodySchema.parse(body)
  
  const orderId = `order-${Date.now()}`
  
  logger.info('Creating order', {
    orderId,
    userId: tokenInfo!.userId,
    productId,
    quantity
  })
  
  const order = {
    orderId,
    userId: tokenInfo!.userId,
    userEmail: tokenInfo!.email,
    productId,
    quantity,
    status: 'pending',
    createdAt: new Date().toISOString()
  }
  
  await emit({
    topic: 'order.created',
    data: {
      ...order,
      userContext: {
        userId: tokenInfo!.userId,
        email: tokenInfo!.email,
        role: tokenInfo!.role
      }
    }
  })
  
  logger.info('Order created and event emitted', { orderId })
  
  return {
    status: 201,
    body: {
      orderId,
      status: 'pending',
      message: 'Order created successfully'
    }
  }
}

