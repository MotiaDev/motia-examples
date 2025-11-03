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
  name: 'OptimizeBudget',
  description: 'Creates a detailed budget breakdown and optimization suggestions',
  subscribes: ['optimize-budget'],
  emits: [],
  input: inputSchema,
  flows: ['travel-planning'],
}

export const handler: Handlers['OptimizeBudget'] = async (input, { logger, state }) => {
  const { planId, travelRequest, request } = input
  
  const agentResult: z.infer<typeof AgentResultSchema> = {
    agentName: 'Budget Agent',
    status: 'running',
    timestamp: new Date().toISOString(),
  }
  
  try {
    logger.info('Starting budget optimization', { planId, budget: request.budget })
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    
    // Get all previous agent results
    const plan = await travelPlanService.getPlan(state, planId)
    const flightInfo = plan?.agents.find(a => a.agentName === 'Flight Search Agent')?.result || ''
    const hotelInfo = plan?.agents.find(a => a.agentName === 'Hotel Search Agent')?.result || ''
    const diningInfo = plan?.agents.find(a => a.agentName === 'Dining Agent')?.result || ''
    const itineraryInfo = plan?.agents.find(a => a.agentName === 'Itinerary Specialist')?.result || ''
    
    const systemPrompt = `You are a Budget Optimization Agent specializing in travel cost management.

Your role is to:
1. Create detailed budget breakdowns
2. Ensure costs align with user's budget
3. Identify cost-saving opportunities
4. Suggest budget optimizations while maintaining experience quality
5. Provide spending recommendations by category
6. Consider currency and payment tips

Provide comprehensive budget analysis with:
- Detailed cost breakdown by category
- Total trip cost per person and for group
- Comparison to user's budget
- Cost-saving suggestions
- Spending flexibility recommendations
- Payment and currency tips`

    const userPrompt = `Create a detailed budget breakdown for the trip to ${request.destination}

User's Travel Request:
${travelRequest}

Trip Details:
- Duration: ${request.duration} days
- Travelers: ${request.adults} adults, ${request.children} children
- Budget per person: ${request.budget} ${request.budgetCurrency}
- Total budget: ${request.budget * (request.adults + request.children)} ${request.budgetCurrency}
- Budget is ${request.budgetFlexible ? 'flexible' : 'fixed'}
- Travel style: ${request.travelStyle}

Information from agents:

## Flight Options:
${flightInfo}

## Hotel Options:
${hotelInfo}

## Dining Options:
${diningInfo}

## Itinerary:
${itineraryInfo}

Please provide:
1. Detailed budget breakdown:
   - Transportation (flights, local transport, airport transfers)
   - Accommodation (per night × ${request.duration} nights)
   - Food & Dining (breakfast, lunch, dinner)
   - Activities & Attractions (entry fees, tours)
   - Shopping & Souvenirs (estimated allowance)
   - Contingency fund (10-15% of total)

2. Cost analysis:
   - Total cost per person
   - Total cost for entire group
   - Comparison to budget (are we over/under/on-target?)

3. Optimization suggestions:
   - Where to save money without sacrificing experience
   - Splurge recommendations (if budget allows)
   - Cost-effective alternatives

4. Practical tips:
   - Best payment methods
   - Currency exchange recommendations
   - When to book for best prices

Format as a comprehensive budget guide in clear markdown with tables where appropriate.`

    const result = await travelPlanService.generateItinerary(systemPrompt, userPrompt)
    
    agentResult.status = 'completed'
    agentResult.result = result
    agentResult.timestamp = new Date().toISOString()
    
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    logger.info('Budget optimization completed', { planId })
    
  } catch (error) {
    agentResult.status = 'failed'
    agentResult.error = error instanceof Error ? error.message : 'Unknown error'
    agentResult.timestamp = new Date().toISOString()
    
    await travelPlanService.updateAgentResult(state, planId, agentResult)
    logger.error('Budget optimization failed', { planId, error })
    throw error
  }
}
