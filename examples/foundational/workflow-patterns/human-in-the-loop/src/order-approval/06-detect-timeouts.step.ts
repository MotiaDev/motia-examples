import { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  type: 'cron',
  name: 'DetectTimeouts',
  description: 'Find orders stuck awaiting approval and escalate',
  cron: '*/5 * * * *',  // Every 5 minutes (for demo - use hourly in production)
  flows: ['order-approval'],
  emits: [],
}

export const handler: Handlers['DetectTimeouts'] = async ({ state, logger }) => {
  const orders = await state.getGroup('orders')
  const now = Date.now()
  const timeoutMs = 10 * 60 * 1000  // 10 minutes (for demo - use 24 hours in production)
  
  let stuckCount = 0
  
  for (const order of orders) {
    // Find orders stuck in awaiting_approval
    if (order.status === 'awaiting_approval') {
      const lastUpdate = new Date(order.updatedAt || order.createdAt).getTime()
      const age = now - lastUpdate
      
      if (age > timeoutMs) {
        stuckCount++
        
        logger.warn('Approval timeout detected', {
          orderId: order.id,
          ageMinutes: Math.round(age / (60 * 1000)),
          riskScore: order.riskScore,
          total: order.total,
        })
        
        // In production, take action:
        // 1. Send escalation notification
        // 2. Auto-reject if too old
        // 3. Assign to different manager
        // 4. Create support ticket
        
        // Mark as timed out
        order.status = 'timeout'
        order.timeoutAt = new Date().toISOString()
        order.timeoutReason = `No approval received within ${Math.round(timeoutMs / (60 * 1000))} minutes`
        await state.set('orders', order.id, order)
        
        // Simulate escalation notification
        logger.info('Escalation triggered', {
          orderId: order.id,
          action: 'timeout_escalation',
          notifyChannel: '#urgent-approvals',
        })
      }
    }
  }
  
  if (stuckCount > 0) {
    logger.info('Timeout detection complete', { 
      stuckCount,
      totalOrders: orders.length 
    })
  }
}

