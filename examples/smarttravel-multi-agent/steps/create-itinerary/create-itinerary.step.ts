import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { TravelPlanRequestSchema, AgentResultSchema } from '../../types/travel-plan'
import { travelPlanService } from '../../src/services/travel-plan'

const inputSchema = z.object({
  planId: z.string(),
  travelRequest: z.string(),
  request: TravelPlanRequestSchema,
})

export const config: EventConfig = {
  type: 'event',
  name: 'CreateItinerary',
  description: 'Creates a detailed day-by-day itinerary from all gathered information',
  subscribes: ['create-itinerary'],
  emits: [],
  input: inputSchema,
  flows: ['travel-planning'],
}

export const handler: Handlers['CreateItinerary'] = async (input, { logger, state }) => {
  const { planId, travelRequest, request } = input
  
  const agentResult: z.infer<typeof AgentResultSchema> = {
    agentName: 'Itinerary Specialist',
    status: 'running',
    timestamp: new Date().toISOString(),
  }
  
  try {
    logger.info('Starting itinerary creation', { planId, duration: request.duration })
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    
    // Get all previous agent results
    const plan = await travelPlanService.getPlan(state, planId)
    const destinationInfo = plan?.agents.find(a => a.agentName === 'Destination Explorer')?.result || ''
    const flightInfo = plan?.agents.find(a => a.agentName === 'Flight Search Agent')?.result || ''
    const hotelInfo = plan?.agents.find(a => a.agentName === 'Hotel Search Agent')?.result || ''
    const diningInfo = plan?.agents.find(a => a.agentName === 'Dining Agent')?.result || ''
    
    const systemPrompt = `You are an Itinerary Specialist creating perfect day-by-day travel plans.

Your role is to:
1. Synthesize all research into a cohesive daily itinerary
2. Balance activities based on preferred pace
3. Consider travel time between locations
4. Match activities to travel vibes and preferences
5. Include meal recommendations at appropriate times
6. Build in rest periods and flexibility
7. Optimize the flow and logistics

Create detailed itineraries with:
- Day-by-day breakdown
- Morning, afternoon, and evening activities
- Specific timing and duration estimates
- Transportation between activities
- Meal recommendations integrated into the schedule
- Tips for each day
- Weather considerations
- Backup options for flexibility`

    const userPrompt = `Create a detailed ${request.duration}-day itinerary for ${request.destination}

User's Travel Request:
${travelRequest}

Available Information:

## Destination Research:
${destinationInfo}

## Flight Options:
${flightInfo}

## Hotel Options:
${hotelInfo}

## Dining Options:
${diningInfo}

Please create:
1. Day-by-day itinerary for all ${request.duration} days
2. For each day, organize into:
   - Morning (activities, breakfast recommendations, timing)
   - Afternoon (activities, lunch recommendations, timing)
   - Evening (activities, dinner recommendations, timing)
   - Accommodation details
   - Daily notes and tips

3. Consider:
   - Their preferred pace: ${(request.pace || [2]).map(p => `Level ${p}`).join(', ')}
   - Travel vibes: ${(request.vibes || []).join(', ') || 'Not specified'}
   - Travel style: ${request.travelStyle}
   - Group composition: ${request.adults} adults, ${request.children} children

4. Include:
   - Realistic timing and duration for each activity
   - Travel time between locations
   - Rest periods appropriate to their pace
   - Weather considerations
   - Backup options

Format as a comprehensive day-by-day guide in clear markdown with sections for each day.`

    const result = await travelPlanService.generateItinerary(systemPrompt, userPrompt, 'gpt-4o')
    
    agentResult.status = 'completed'
    agentResult.result = result
    agentResult.timestamp = new Date().toISOString()
    
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    logger.info('Itinerary creation completed', { planId })
    
  } catch (error) {
    agentResult.status = 'failed'
    agentResult.error = error instanceof Error ? error.message : 'Unknown error'
    agentResult.timestamp = new Date().toISOString()
    
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    logger.error('Itinerary creation failed', { planId, error })
    throw error
  }
}
