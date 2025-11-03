import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { TravelPlanRequestSchema, TravelPlanResponseSchema } from '../../types/travel-plan'
import { travelPlanService } from '../../src/services/travel-plan'

const bodySchema = z.object({
  request: TravelPlanRequestSchema,
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'TriggerTravelPlan',
  description: 'Triggers the travel planning process with specialized AI agents',
  path: '/api/travel-plan/trigger',
  method: 'POST',
  emits: ['orchestrate-travel-planning'],
  flows: ['travel-planning'],
  bodySchema,
  responseSchema: {
    200: TravelPlanResponseSchema,
  },
}

export const handler: Handlers['TriggerTravelPlan'] = async (req, { emit, logger, state }) => {
  const { request } = req.body
  
  // Generate unique plan ID
  const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  logger.info('Creating travel plan', { planId, destination: request.destination })
  
  // Initialize plan state
  await travelPlanService.createPlan(state, planId, request)
  
  // Emit event to start the orchestration process
  await emit({
    topic: 'orchestrate-travel-planning',
    data: {
      planId,
      request,
    },
  })
  
  logger.info('Travel plan initiated', { planId })
  
  return {
    status: 200,
    body: {
      success: true,
      message: 'Travel plan generation initiated successfully',
      planId,
      status: 'pending' as const,
    },
  }
}

