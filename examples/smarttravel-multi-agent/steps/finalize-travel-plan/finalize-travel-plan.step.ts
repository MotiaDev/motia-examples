import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { travelPlanService } from '../../src/services/travel-plan'

const inputSchema = z.object({
  planId: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'FinalizeTravelPlan',
  description: 'Combines all agent results into a comprehensive final itinerary',
  subscribes: ['finalize-travel-plan'],
  emits: [],
  input: inputSchema,
  flows: ['travel-planning'],
}

export const handler: Handlers['FinalizeTravelPlan'] = async (input, { logger, state }) => {
  const { planId } = input
  
  try {
    logger.info('Starting travel plan finalization', { planId })
    
    const plan = await travelPlanService.getPlan(state, planId)
    
    if (!plan) {
      throw new Error(`Plan ${planId} not found`)
    }
    
    // Gather all agent results
    const destinationResult = plan.agents.find(a => a.agentName === 'Destination Explorer')
    const flightResult = plan.agents.find(a => a.agentName === 'Flight Search Agent')
    const hotelResult = plan.agents.find(a => a.agentName === 'Hotel Search Agent')
    const diningResult = plan.agents.find(a => a.agentName === 'Dining Agent')
    const itineraryResult = plan.agents.find(a => a.agentName === 'Itinerary Specialist')
    const budgetResult = plan.agents.find(a => a.agentName === 'Budget Agent')
    
    // Check if all agents completed successfully
    const failedAgents = plan.agents.filter(a => a.status === 'failed')
    if (failedAgents.length > 0) {
      const errorMsg = `Some agents failed: ${failedAgents.map(a => a.agentName).join(', ')}`
      logger.error('Travel plan finalization failed due to agent failures', { planId, failedAgents: failedAgents.map(a => a.agentName) })
      plan.error = errorMsg
      plan.status = 'failed'
      plan.completedAt = new Date().toISOString()
      return
    }
    
    // Create comprehensive final itinerary with AI
    const systemPrompt = `You are a Travel Plan Compiler creating the final comprehensive travel guide.

Your role is to:
1. Synthesize all agent outputs into a cohesive, beautiful travel guide
2. Ensure all information flows logically
3. Format for easy reading and reference
4. Include all essential details
5. Make it inspiring and actionable`

    const userPrompt = `Compile all the following information into a comprehensive, beautifully formatted travel guide:

# DESTINATION RESEARCH
${destinationResult?.result || 'Not available'}

# FLIGHT OPTIONS
${flightResult?.result || 'Not available'}

# ACCOMMODATION OPTIONS
${hotelResult?.result || 'Not available'}

# DINING RECOMMENDATIONS
${diningResult?.result || 'Not available'}

# DAY-BY-DAY ITINERARY
${itineraryResult?.result || 'Not available'}

# BUDGET BREAKDOWN
${budgetResult?.result || 'Not available'}

Please create a final comprehensive travel guide with:
1. Executive Summary
2. Essential Trip Information
3. Complete Day-by-Day Itinerary
4. Accommodation & Dining Guide
5. Budget Overview
6. Travel Tips & Recommendations
7. Pre-Trip Checklist

Format beautifully with markdown, emojis for visual appeal, and clear sections.`

    const finalItinerary = await travelPlanService.generateItinerary(
      systemPrompt, 
      userPrompt, 
      'gpt-4o'
    )
    
    // Store the complete final plan
    const completePlan = {
      summary: finalItinerary,
      detailedResults: {
        destination: destinationResult?.result,
        flights: flightResult?.result,
        hotels: hotelResult?.result,
        dining: diningResult?.result,
        itinerary: itineraryResult?.result,
        budget: budgetResult?.result,
      },
    }
    
    await travelPlanService.setFinalItinerary(state, planId, completePlan)
    await travelPlanService.updatePlanStatus(state, planId, 'completed', 'Travel plan completed', 100)
    
    logger.info('Travel plan finalization completed', { planId })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Travel plan finalization failed', { planId, error: errorMessage })
    
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
