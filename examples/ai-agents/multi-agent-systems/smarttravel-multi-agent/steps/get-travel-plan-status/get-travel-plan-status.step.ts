import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { TravelPlanStatusSchema } from '../../types/travel-plan'
import { travelPlanService } from '../../src/services/travel-plan'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetTravelPlanStatus',
  description: 'Retrieves the current status and results of a travel plan',
  path: '/api/travel-plan/status/:planId',
  method: 'GET',
  emits: [],
  flows: ['travel-planning'],
  responseSchema: {
    200: TravelPlanStatusSchema,
    404: z.object({ error: z.string() }),
  },
}

export const handler: Handlers['GetTravelPlanStatus'] = async (req, { logger, state }) => {
  const { planId } = req.pathParams
  
  logger.info('Fetching travel plan status', { planId })
  
  const plan = await travelPlanService.getPlan(state, planId)
  
  if (!plan) {
    logger.warn('Travel plan not found', { planId })
    return {
      status: 404,
      body: {
        error: `Travel plan with ID ${planId} not found`,
      },
    }
  }
  
  logger.info('Travel plan status retrieved', { planId, status: plan.status })
  
  return {
    status: 200,
    body: plan,
  }
}

