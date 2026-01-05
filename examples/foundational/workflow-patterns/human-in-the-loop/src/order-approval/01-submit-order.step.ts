import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const bodySchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
  })),
  customerEmail: z.string().email(),
  total: z.number(),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'SubmitOrder',
  description: 'Submit a new order for processing',
  path: '/orders',
  method: 'POST',
  bodySchema,
  flows: ['order-approval'],
  emits: ['order.submitted'],
  responseSchema: {
    201: z.object({
      orderId: z.string(),
      status: z.string(),
      message: z.string(),
    }),
  },
}

export const handler: Handlers['SubmitOrder'] = async (req, { state, emit, logger }) => {
  const orderId = crypto.randomUUID()
  const { items, customerEmail, total } = req.body
  
  const order = {
    id: orderId,
    items,
    customerEmail,
    total,
    status: 'pending_analysis',
    currentStep: 'submitted',
    completedSteps: ['submitted'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  // Save immediately - first checkpoint
  await state.set('orders', orderId, order)
  
  logger.info('Order submitted', { orderId, total, customerEmail })
  
  // Trigger risk analysis
  await emit({
    topic: 'order.submitted',
    data: { orderId },
  })
  
  return {
    status: 201,
    body: {
      orderId,
      status: order.status,
      message: 'Order submitted successfully. Analyzing risk...',
    },
  }
}

