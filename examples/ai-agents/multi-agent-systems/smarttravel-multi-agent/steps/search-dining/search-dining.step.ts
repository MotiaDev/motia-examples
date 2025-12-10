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
  name: 'SearchDining',
  description: 'Finds and recommends dining experiences and restaurants',
  subscribes: ['search-dining'],
  emits: [],
  input: inputSchema,
  flows: ['travel-planning'],
}

export const handler: Handlers['SearchDining'] = async (input, { logger, state }) => {
  const { planId, travelRequest, request } = input
  
  const agentResult: z.infer<typeof AgentResultSchema> = {
    agentName: 'Dining Agent',
    status: 'running',
    timestamp: new Date().toISOString(),
  }
  
  try {
    logger.info('Starting dining search', { planId, destination: request.destination })
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    
    const systemPrompt = `You are a Dining & Culinary Experience Agent specializing in food recommendations.

Your role is to:
1. Research and recommend restaurants and dining experiences
2. Consider cuisine preferences, budget, and travel vibes
3. Find both popular spots and hidden culinary gems
4. Provide detailed information about each restaurant
5. Consider dietary restrictions and special requirements

Provide responses with:
- Multiple dining options (at least 5)
- Restaurant descriptions and specialties
- Price ranges and typical meal costs
- Ambiance and dining experience details
- Reservation requirements
- Local food culture insights`

    const userPrompt = `Find dining options in ${request.destination}

User's Travel Request:
${travelRequest}

Please provide:
1. Top 5 restaurants matching their travel vibes and budget
2. Mix of local cuisine and popular dining spots
3. Restaurant descriptions with signature dishes
4. Price ranges (mark as estimates)
5. Ambiance and dining experience details
6. Reservation recommendations
7. Local food culture tips and must-try dishes
8. Consider if they mentioned food-focused travel vibe

Budget per person: ${request.budget} ${request.budgetCurrency}
Travel Style: ${request.travelStyle}

Note: Include a mix of breakfast, lunch, and dinner options. Mark all prices as estimates.

Format the response in clear markdown with sections.`

    const result = await travelPlanService.generateItinerary(systemPrompt, userPrompt)
    
    agentResult.status = 'completed'
    agentResult.result = result
    agentResult.timestamp = new Date().toISOString()
    
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    logger.info('Dining search completed', { planId })
    
  } catch (error) {
    agentResult.status = 'failed'
    agentResult.error = error instanceof Error ? error.message : 'Unknown error'
    agentResult.timestamp = new Date().toISOString()
    
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    logger.error('Dining search failed', { planId, error })
    throw error
  }
}
