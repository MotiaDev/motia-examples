import type { TravelPlanStatus } from '../../../types/travel-plan'
import type { InternalStateManager } from 'motia'

export async function createPlan(
  state: InternalStateManager,
  planId: string,
  request: any
): Promise<TravelPlanStatus> {
  const plan: TravelPlanStatus = {
    planId,
    status: 'pending',
    currentStep: 'Initialized',
    progress: 0,
    agents: [],
    startedAt: new Date().toISOString(),
  }
  await state.set('travel-plans', planId, plan)
  return plan
}

