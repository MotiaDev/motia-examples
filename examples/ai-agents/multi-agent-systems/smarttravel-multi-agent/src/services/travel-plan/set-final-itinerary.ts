import type { TravelPlanStatus } from '../../../types/travel-plan'
import type { InternalStateManager } from 'motia'

export async function setFinalItinerary(
  state: InternalStateManager,
  planId: string,
  itinerary: any
): Promise<void> {
  const plan = await state.get<TravelPlanStatus>('travel-plans', planId)
  if (plan) {
    plan.finalItinerary = itinerary
    await state.set('travel-plans', planId, plan)
  }
}

