import { EventConfig, Handlers } from 'motia'

export const config: EventConfig = {
  type: 'event',
  name: 'CompleteOrder',
  description: 'Final step - complete approved orders',
  subscribes: ['order.approved', 'order.auto_approved'],
  flows: ['order-approval'],
  emits: [],
}

export const handler: Handlers['CompleteOrder'] = async (input, { state, logger }) => {
  const { orderId } = input
  
  const order = await state.get('orders', orderId)
  
  if (!order) {
    logger.error('Order not found', { orderId })
    return
  }
  
  // Skip if already completed
  if (order.completedSteps.includes('completed')) {
    logger.info('Order already completed', { orderId })
    return
  }
  
  try {
    // In production: charge payment, create shipment, send confirmation email
    logger.info('Processing order fulfillment', { orderId })
    
    // Simulate fulfillment
    await simulateFulfillment(order)
    
    order.status = 'completed'
    order.currentStep = 'completed'
    order.completedAt = new Date().toISOString()
    order.completedSteps.push('completed')
    order.updatedAt = new Date().toISOString()
    
    await state.set('orders', orderId, order)
    
    logger.info('Order completed successfully', {
      orderId,
      total: order.total,
      approvedBy: order.approvedBy,
    })
    
  } catch (error) {
    order.lastError = error.message
    order.status = 'error'
    await state.set('orders', orderId, order)
    logger.error('Order fulfillment failed', { orderId, error: error.message })
  }
}

async function simulateFulfillment(order: any): Promise<void> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // In production:
  // - Charge payment gateway
  // - Create shipment in warehouse system
  // - Send confirmation email to customer
  // - Update inventory
  // - Log to analytics
}

