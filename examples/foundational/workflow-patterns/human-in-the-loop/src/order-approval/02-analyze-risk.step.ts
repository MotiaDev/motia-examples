import { EventConfig, Handlers } from 'motia'

export const config: EventConfig = {
  type: 'event',
  name: 'AnalyzeRisk',
  description: 'Analyze order risk and determine if approval needed',
  subscribes: ['order.submitted'],
  flows: ['order-approval'],
  emits: ['order.auto_approved'],
  virtualEmits: [{ topic: 'approval.required', label: 'Requires human approval' }],
}

export const handler: Handlers['AnalyzeRisk'] = async (input, { state, emit, logger }) => {
  const { orderId } = input
  
  const order = await state.get('orders', orderId)
  
  if (!order) {
    logger.error('Order not found', { orderId })
    return
  }
  
  // Skip if already analyzed
  if (order.completedSteps.includes('risk_analysis')) {
    logger.info('Risk analysis already done', { orderId })
    return
  }
  
  // Update state before processing
  order.currentStep = 'risk_analysis'
  await state.set('orders', orderId, order)
  
  try {
    // Simulate risk analysis (in production: call AI service, check fraud DB, etc.)
    const riskScore = calculateRiskScore(order)
    
    order.riskScore = riskScore
    order.completedSteps.push('risk_analysis')
    
    logger.info('Risk analysis completed', { orderId, riskScore })
    
    // High risk = requires human approval
    if (riskScore > 70) {
      order.status = 'awaiting_approval'
      order.currentStep = 'awaiting_approval'
      order.requiresApproval = true
      order.approvalReason = `High risk score: ${riskScore}`
      
      await state.set('orders', orderId, order)
      
      logger.warn('Order requires approval - workflow paused', { orderId, riskScore })
      
      // Workflow STOPS here - waits for webhook call
      // No emit needed - webhook will restart the flow
      
    } else {
      // Low risk = auto-approve
      order.status = 'approved'
      order.currentStep = 'approved'
      order.approvedBy = 'system'
      order.approvedAt = new Date().toISOString()
      order.completedSteps.push('approved')
      
      await state.set('orders', orderId, order)
      
      logger.info('Order auto-approved', { orderId, riskScore })
      
      await emit({
        topic: 'order.auto_approved',
        data: { orderId },
      })
    }
    
  } catch (error) {
    order.lastError = error.message
    await state.set('orders', orderId, order)
    logger.error('Risk analysis failed', { orderId, error: error.message })
  }
}

function calculateRiskScore(order: any): number {
  // Simple risk calculation (in production: use ML model)
  let score = 0
  
  // High order value = higher risk
  if (order.total > 1000) score += 40
  else if (order.total > 500) score += 20
  
  // Many items = higher risk
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  if (itemCount > 10) score += 30
  else if (itemCount > 5) score += 15
  
  // Random factor (simulates other signals)
  score += Math.random() * 40
  
  return Math.min(Math.round(score), 100)
}

