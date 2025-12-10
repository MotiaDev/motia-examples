import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { TravelPlanRequestSchema, AgentResultSchema } from '../../types/travel-plan'
import { travelPlanService } from '../../src/services/travel-plan'

const inputSchema = z.object({
  planId: z.string(),
  destination: z.string(),
  travelRequest: z.string(),
  request: TravelPlanRequestSchema,
})

export const config: EventConfig = {
  type: 'event',
  name: 'ResearchDestination',
  description: 'Researches destination attractions, activities, and local information',
  subscribes: ['research-destination'],
  emits: [],
  input: inputSchema,
  flows: ['travel-planning'],
}

export const handler: Handlers['ResearchDestination'] = async (input, { logger, state }) => {
  const { planId, destination, travelRequest } = input
  
  const agentResult: z.infer<typeof AgentResultSchema> = {
    agentName: 'Destination Explorer',
    status: 'running',
    timestamp: new Date().toISOString(),
  }
  
  try {
    logger.info('Starting destination research', { planId, destination })
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    
    const systemPrompt = `You are a Destination Research Agent specializing in discovering attractions and experiences.

Your role is to:
1. Research and recommend mainstream tourist attractions and experiences
2. Find hidden gems that match the traveler's interests
3. Provide detailed information about each attraction
4. Consider the travel style, vibes, and preferences

Provide responses in a structured format with:
- Main attractions with descriptions
- Local cultural information
- Best times to visit specific places
- Insider tips and recommendations
- Hidden gems that match their interests`

    const userPrompt = `Research the destination: ${destination}

User's Travel Request:
${travelRequest}

Please provide:
1. Top 10 attractions/activities that match their travel style and vibes
2. Hidden gems and local favorites
3. Cultural insights and local customs
4. Best times to visit specific attractions
5. Estimated duration for each activity
6. Any special tips or recommendations

Format the response in clear markdown with sections.`

    const result = await travelPlanService.generateItinerary(systemPrompt, userPrompt)
    
    agentResult.status = 'completed'
    agentResult.result = result
    agentResult.timestamp = new Date().toISOString()
    
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    logger.info('Destination research completed', { planId })
    
  } catch (error) {
    agentResult.status = 'failed'
    agentResult.error = error instanceof Error ? error.message : 'Unknown error'
    agentResult.timestamp = new Date().toISOString()
    
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    logger.error('Destination research failed', { planId, error })
    throw error
  }
}
