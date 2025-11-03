import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { TravelPlanRequestSchema } from '../../types/travel-plan'
import { travelPlanService } from '../../src/services/travel-plan'
import { formatTravelRequestToMarkdown } from '../../src/utils/format-travel-request'

const inputSchema = z.object({
  planId: z.string(),
  request: TravelPlanRequestSchema,
})

export const config: EventConfig = {
  type: 'event',
  name: 'OrchestrateTravelPlanning',
  description: 'Coordinates all specialized agents to generate a comprehensive travel plan',
  subscribes: ['orchestrate-travel-planning'],
  emits: [
    'research-destination',
    'search-flights',
    'search-hotels',
    'search-dining',
    'create-itinerary',
    'optimize-budget',
    'finalize-travel-plan',
  ],
  input: inputSchema,
  flows: ['travel-planning'],
}

export const handler: Handlers['OrchestrateTravelPlanning'] = async (input, { emit, logger, state }) => {
  const { planId, request } = input
  
  try {
    logger.info('Starting travel plan orchestration', { planId })
    
    // Update status to processing
    await travelPlanService.updatePlanStatus(state, planId, 'processing', 'Starting travel plan generation', 5)
    
    // Format the travel request as markdown for agents
    const travelRequestMarkdown = formatTravelRequestToMarkdown(request)
    
    // Phase 1: Research destination (10% progress)
    logger.info('Phase 1: Researching destination', { planId })
    await travelPlanService.updatePlanStatus(state, planId, 'processing', 'Researching destination', 10)
    await emit({
      topic: 'research-destination',
      data: {
        planId,
        destination: request.destination,
        travelRequest: travelRequestMarkdown,
        request,
      },
    })
    
    // Phase 2: Search flights and hotels in parallel (30% progress)
    logger.info('Phase 2: Searching flights and hotels', { planId })
    await travelPlanService.updatePlanStatus(state, planId, 'processing', 'Searching flights and hotels', 30)
    await Promise.all([
      emit({
        topic: 'search-flights',
        data: {
          planId,
          travelRequest: travelRequestMarkdown,
          request,
        },
      }),
      emit({
        topic: 'search-hotels',
        data: {
          planId,
          travelRequest: travelRequestMarkdown,
          request,
        },
      }),
    ])
    
    // Phase 3: Search dining options (50% progress)
    logger.info('Phase 3: Finding dining recommendations', { planId })
    await travelPlanService.updatePlanStatus(state, planId, 'processing', 'Finding dining recommendations', 50)
    await emit({
      topic: 'search-dining',
      data: {
        planId,
        travelRequest: travelRequestMarkdown,
        request,
      },
    })
    
    // Phase 4: Create itinerary (70% progress)
    logger.info('Phase 4: Creating itinerary', { planId })
    await travelPlanService.updatePlanStatus(state, planId, 'processing', 'Creating day-by-day itinerary', 70)
    await emit({
      topic: 'create-itinerary',
      data: {
        planId,
        travelRequest: travelRequestMarkdown,
        request,
      },
    })
    
    // Phase 5: Optimize budget (85% progress)
    logger.info('Phase 5: Optimizing budget', { planId })
    await travelPlanService.updatePlanStatus(state, planId, 'processing', 'Optimizing budget', 85)
    await emit({
      topic: 'optimize-budget',
      data: {
        planId,
        travelRequest: travelRequestMarkdown,
        request,
      },
    })
    
    // Phase 6: Finalize plan (95% progress)
    logger.info('Phase 6: Finalizing travel plan', { planId })
    await travelPlanService.updatePlanStatus(state, planId, 'processing', 'Finalizing travel plan', 95)
    await emit({
      topic: 'finalize-travel-plan',
      data: {
        planId,
      },
    })
    
    logger.info('Travel plan orchestration completed', { planId })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    logger.error('Travel plan orchestration failed', { planId, error: errorMessage })
    
    const plan = await travelPlanService.getPlan(state, planId)
    if (plan) {
      plan.error = errorMessage
      plan.status = 'failed'
      plan.completedAt = new Date().toISOString()
      await state.set('travel-plans', planId, plan)
    }
    throw error
  }
}

