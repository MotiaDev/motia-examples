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
  name: 'SearchHotels',
  description: 'Searches and recommends hotel/accommodation options',
  subscribes: ['search-hotels'],
  emits: [],
  input: inputSchema,
  flows: ['travel-planning'],
}

export const handler: Handlers['SearchHotels'] = async (input, { logger, state }) => {
  const { planId, travelRequest, request } = input
  
  const agentResult: z.infer<typeof AgentResultSchema> = {
    agentName: 'Hotel Search Agent',
    status: 'running',
    timestamp: new Date().toISOString(),
  }
  
  try {
    logger.info('Starting hotel search', { planId, destination: request.destination })
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    
    const systemPrompt = `You are a Hotel Search Agent specializing in finding perfect accommodations.

Your role is to:
1. Research and recommend hotels/accommodations matching user preferences
2. Consider location, budget, and travel style
3. Evaluate amenities and guest reviews
4. Provide detailed property information
5. Suggest booking strategies

Provide responses with:
- Multiple accommodation options (at least 5)
- Detailed property descriptions
- Location and accessibility information
- Amenities and features
- Price estimates per night
- Pros and cons for each option`

    const userPrompt = `Find accommodation options in ${request.destination}

User's Travel Request:
${travelRequest}

Stay Details:
- Duration: ${request.duration} nights
- Guests: ${request.adults} adults, ${request.children} children
- Rooms needed: ${request.rooms || Math.ceil((request.adults + request.children) / 2)}
- Travel style: ${request.travelStyle}
- Budget per person: ${request.budget} ${request.budgetCurrency}

Please provide:
1. Top 5 accommodation options matching their style and budget
2. Property descriptions and unique features
3. Location details and distance to main attractions
4. Amenities (especially relevant to their interests)
5. Estimated prices per night (mark as estimates)
6. Recommendations on which is best for their specific needs

Note: Provide realistic estimates based on typical accommodation prices in the area. Mark all prices as estimates.

Format the response in clear markdown with sections.`

    const result = await travelPlanService.generateItinerary(systemPrompt, userPrompt)
    
    agentResult.status = 'completed'
    agentResult.result = result
    agentResult.timestamp = new Date().toISOString()
    
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    logger.info('Hotel search completed', { planId })
    
  } catch (error) {
    agentResult.status = 'failed'
    agentResult.error = error instanceof Error ? error.message : 'Unknown error'
    agentResult.timestamp = new Date().toISOString()
    
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    logger.error('Hotel search failed', { planId, error })
    throw error
  }
}
