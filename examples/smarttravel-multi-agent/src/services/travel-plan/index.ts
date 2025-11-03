import { createPlan } from './create-plan'
import { getPlan } from './get-plan'
import { updatePlanStatus } from './update-plan-status'
import { updateAgentResult } from './update-agent-result'
import { setFinalItinerary } from './set-final-itinerary'
import { generateItinerary } from './generate-itinerary'

export const travelPlanService = {
  createPlan,
  getPlan,
  updatePlanStatus,
  updateAgentResult,
  setFinalItinerary,
  generateItinerary,
}

