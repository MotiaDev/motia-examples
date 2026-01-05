import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const bodySchema = z.object({
  approved: z.boolean(),
  approvedBy: z.string(),
  notes: z.string().optional(),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ApprovalWebhook',
  description: 'External webhook for human approval decisions',
  path: '/webhooks/orders/:orderId/approve',
  method: 'POST',
  bodySchema,
  flows: ['order-approval'],
  emits: ['order.approved'],
  virtualSubscribes: ['human.decision'],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      order: z.any().optional(),
    }),
    404: z.object({ error: z.string() }),
    400: z.object({ error: z.string() }),
  },
}

export const handler: Handlers['ApprovalWebhook'] = async (req, { state, emit, logger }) => {
  const { orderId } = req.pathParams
  const { approved, approvedBy, notes } = req.body
  
  logger.info('Processing approval decision', { orderId, approved, approvedBy })
  
  // Load the order
  const order = await state.get('orders', orderId)
  
  if (!order) {
    return {
      status: 404,
      body: { error: 'Order not found' },
    }
  }
  
  // Verify order is waiting for approval
  if (order.currentStep !== 'awaiting_approval') {
    logger.warn('Order not awaiting approval', {
      orderId,
      currentStep: order.currentStep,
    })
    return {
      status: 400,
      body: {
        error: `Order is not awaiting approval. Current status: ${order.status}`,
      },
    }
  }
  
  // Update order with approval decision
  if (approved) {
    order.status = 'approved'
    order.currentStep = 'approved'
    order.approvedBy = approvedBy
    order.approvedAt = new Date().toISOString()
    order.approvalNotes = notes
    order.completedSteps.push('approved')
    order.updatedAt = new Date().toISOString()
    
    await state.set('orders', orderId, order)
    
    logger.info('Order approved by human', { orderId, approvedBy })
    
    // Continue workflow
    await emit({
      topic: 'order.approved',
      data: { orderId },
    })
    
    return {
      status: 200,
      body: {
        success: true,
        message: 'Order approved successfully',
        order,
      },
    }
    
  } else {
    // Rejected - just log and save, workflow ends
    order.status = 'rejected'
    order.currentStep = 'rejected'
    order.rejectedBy = approvedBy
    order.rejectedAt = new Date().toISOString()
    order.rejectionReason = notes || 'No reason provided'
    order.completedSteps.push('rejected')
    order.updatedAt = new Date().toISOString()
    
    await state.set('orders', orderId, order)
    
    logger.info('Order rejected by human - workflow ends', { orderId, approvedBy, reason: notes })
    
    return {
      status: 200,
      body: {
        success: true,
        message: 'Order rejected',
        order,
      },
    }
  }
}

