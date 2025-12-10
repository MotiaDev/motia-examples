import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  orderId: z.string(),
  userId: z.string(),
  userEmail: z.string(),
  productId: z.string(),
  quantity: z.number(),
  status: z.string(),
  createdAt: z.string(),
  userContext: z.object({
    userId: z.string(),
    email: z.string(),
    role: z.string()
  })
})

export const config: EventConfig = {
  name: 'ProcessOrder',
  type: 'event',
  subscribes: ['order.created'],
  description: 'Process order created event with user context',
  input: inputSchema,
  emits: [],
  flows: ['jwt-auth-example']
}

export const handler: Handlers['ProcessOrder'] = async (input, { logger }) => {
  const { orderId, userId, userEmail, productId, quantity, userContext } = input
  
  logger.info('Processing order', {
    orderId,
    userId,
    userEmail,
    productId,
    quantity
  })
  
  logger.info('User context from JWT', userContext)
  
  if (userContext.role === 'admin') {
    logger.info('Admin order - applying priority processing')
  }
  
  logger.info('Sending confirmation email', {
    to: userEmail,
    orderId
  })
  
  logger.info('Order processed successfully', { orderId })
}

