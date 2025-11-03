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
  name: 'SearchFlights',
  description: 'Searches and recommends flight options based on travel preferences',
  subscribes: ['search-flights'],
  emits: [],
  input: inputSchema,
  flows: ['travel-planning'],
}

export const handler: Handlers['SearchFlights'] = async (input, { logger, state }) => {
  const { planId, travelRequest, request } = input
  
  const agentResult: z.infer<typeof AgentResultSchema> = {
    agentName: 'Flight Search Agent',
    status: 'running',
    timestamp: new Date().toISOString(),
  }
  
  try {
    logger.info('Starting flight search', { planId, from: request.startingLocation, to: request.destination })
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    
    const systemPrompt = `You are a Flight Search Agent specializing in finding optimal flight options.

Your role is to:
1. Research and recommend flight options based on user preferences
2. Consider budget constraints and travel style
3. Find the best balance between price, duration, and convenience
4. Provide detailed flight information
5. Suggest booking strategies

Provide responses with:
- Multiple flight options (at least 5)
- Detailed routing information
- Price estimates
- Duration and layover details
- Tips for booking and saving money`

    const userPrompt = `Find flight options from ${request.startingLocation} to ${request.destination}

User's Travel Request:
${travelRequest}

Travel Dates:
- Departure: ${request.travelDates.start}
- Return: ${request.travelDates.end || `After ${request.duration} days`}

Budget per person: ${request.budget} ${request.budgetCurrency}
Travel Style: ${request.travelStyle}

Please provide:
1. Top 5 flight options with different price/convenience trade-offs
2. Airline options and routing details
3. Estimated prices (clearly mark as estimates for planning purposes)
4. Duration and layover information
5. Best booking strategies and times
6. Tips for this specific route

Note: Provide realistic estimates based on typical flight patterns and prices. Mark all prices as estimates for planning.

Format the response in clear markdown with sections.`

    const result = await travelPlanService.generateItinerary(systemPrompt, userPrompt)
    
    agentResult.status = 'completed'
    agentResult.result = result
    agentResult.timestamp = new Date().toISOString()
    
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    logger.info('Flight search completed', { planId })
    
  } catch (error) {
    agentResult.status = 'failed'
    agentResult.error = error instanceof Error ? error.message : 'Unknown error'
    agentResult.timestamp = new Date().toISOString()
    
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    logger.error('Flight search failed', { planId, error })
    throw error
  }
}
