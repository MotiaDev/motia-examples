import type { TravelPlanStatus } from '../../../types/travel-plan'
import type { InternalStateManager } from 'motia'

export async function updatePlanStatus(
  state: InternalStateManager,
  planId: string,
  status: TravelPlanStatus['status'],
  currentStep?: string,
  progress?: number
): Promise<void> {
  const plan = await state.get<TravelPlanStatus>('travel-plans', planId)
  if (plan) {
    plan.status = status
    if (currentStep) plan.currentStep = currentStep
    if (progress !== undefined) plan.progress = progress
    if (status === 'completed' || status === 'failed') {
      plan.completedAt = new Date().toISOString()
    }
    await state.set('travel-plans', planId, plan)
  }
}

