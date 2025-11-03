import type { TravelPlanStatus } from '../../../types/travel-plan'
import type { InternalStateManager } from 'motia'

export async function getPlan(
  state: InternalStateManager,
  planId: string
): Promise<TravelPlanStatus | null> {
  return await state.get<TravelPlanStatus>('travel-plans', planId)
}

