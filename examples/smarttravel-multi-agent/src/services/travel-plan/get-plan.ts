import type { TravelPlanStatus } from '../../../types/travel-plan'
import type { InternalStateManager } from 'motia'

export async function getPlan(
  state: InternalStateManager,
  planId: string
): Promise<TravelPlanStatus | null> {
  const plan = await state.get<TravelPlanStatus>('travel-plans', planId)
  
  // Debug logging
  if (plan) {
    console.log('[DEBUG getPlan]', {
      planId,
      hasFinalItinerary: !!plan.finalItinerary,
      finalItineraryKeys: plan.finalItinerary ? Object.keys(plan.finalItinerary) : [],
      hasDetailedResults: !!(plan.finalItinerary as any)?.detailedResults,
      detailedResultsKeys: (plan.finalItinerary as any)?.detailedResults ? Object.keys((plan.finalItinerary as any).detailedResults) : [],
      detailedResultsType: typeof (plan.finalItinerary as any)?.detailedResults,
    })
  }
  
  return plan
}

