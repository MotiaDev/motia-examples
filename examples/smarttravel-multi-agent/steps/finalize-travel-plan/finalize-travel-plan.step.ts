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
    
    // Wait for all agents to complete (poll every 2 seconds, max 2 minutes)
    const maxWaitTime = 120000 // 2 minutes
    const pollInterval = 2000 // 2 seconds
    const startTime = Date.now()
    const expectedAgents = [
      'Destination Explorer',
      'Flight Search Agent',
      'Hotel Search Agent',
      'Dining Agent',
      'Itinerary Specialist',
      'Budget Agent'
    ]
    
    let plan = await travelPlanService.getPlan(state, planId)
    if (!plan) {
      throw new Error(`Plan ${planId} not found`)
    }
    
    logger.info('Waiting for all agents to complete', { planId, expectedAgents: expectedAgents.length })
    
    while (Date.now() - startTime < maxWaitTime) {
      plan = await travelPlanService.getPlan(state, planId)
      if (!plan) {
        throw new Error(`Plan ${planId} not found`)
      }
      
      const completedAgents = plan.agents.filter(a => a.status === 'completed' && a.result)
      const runningAgents = plan.agents.filter(a => a.status === 'running')
      const failedAgents = plan.agents.filter(a => a.status === 'failed')
      
      logger.info('Agent completion status', { 
        planId,
        completed: completedAgents.length,
        running: runningAgents.length,
        failed: failedAgents.length,
        expected: expectedAgents.length
      })
      
      // Update UI with current progress
      await travelPlanService.updatePlanStatus(
        state, 
        planId, 
        'processing', 
        `Compiling results from ${completedAgents.length}/${expectedAgents.length} agents...`, 
        95
      )
      
      // Check if all expected agents have completed
      if (completedAgents.length === expectedAgents.length) {
        logger.info('All agents completed successfully', { planId })
        break
      }
      
      // Check if any agents failed
      if (failedAgents.length > 0) {
        logger.warn('Some agents failed, proceeding with finalization', { 
          planId, 
          failedAgents: failedAgents.map(a => a.agentName) 
        })
        break
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
    
    if (Date.now() - startTime >= maxWaitTime) {
      logger.warn('Timeout waiting for agents, proceeding with available results', { planId })
    }
    
    // Gather all agent results
    logger.info('Agent results in plan', {
      planId,
      agentCount: plan.agents.length,
      agentNames: plan.agents.map(a => a.agentName),
      agentStatuses: plan.agents.map(a => ({ name: a.agentName, status: a.status, hasResult: !!a.result, resultLength: a.result?.length || 0 }))
    })
    
    const destinationResult = plan.agents.find(a => a.agentName === 'Destination Explorer')
    const flightResult = plan.agents.find(a => a.agentName === 'Flight Search Agent')
    const hotelResult = plan.agents.find(a => a.agentName === 'Hotel Search Agent')
    const diningResult = plan.agents.find(a => a.agentName === 'Dining Agent')
    const itineraryResult = plan.agents.find(a => a.agentName === 'Itinerary Specialist')
    const budgetResult = plan.agents.find(a => a.agentName === 'Budget Agent')
    
    logger.info('Found agent results', {
      planId,
      destination: { found: !!destinationResult, hasResult: !!destinationResult?.result, length: destinationResult?.result?.length || 0 },
      flight: { found: !!flightResult, hasResult: !!flightResult?.result, length: flightResult?.result?.length || 0 },
      hotel: { found: !!hotelResult, hasResult: !!hotelResult?.result, length: hotelResult?.result?.length || 0 },
      dining: { found: !!diningResult, hasResult: !!diningResult?.result, length: diningResult?.result?.length || 0 },
      itinerary: { found: !!itineraryResult, hasResult: !!itineraryResult?.result, length: itineraryResult?.result?.length || 0 },
      budget: { found: !!budgetResult, hasResult: !!budgetResult?.result, length: budgetResult?.result?.length || 0 }
    })
    
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
    
    logger.info('Saving final itinerary', { 
      planId,
      hasSummary: !!completePlan.summary,
      detailedResultsKeys: Object.keys(completePlan.detailedResults),
      detailedResultsHasData: {
        destination: !!completePlan.detailedResults.destination,
        flights: !!completePlan.detailedResults.flights,
        hotels: !!completePlan.detailedResults.hotels,
        dining: !!completePlan.detailedResults.dining,
        itinerary: !!completePlan.detailedResults.itinerary,
        budget: !!completePlan.detailedResults.budget,
      }
    })
    
    await travelPlanService.setFinalItinerary(state, planId, completePlan)
    
    // Verify it was saved correctly
    const verifyPlan = await travelPlanService.getPlan(state, planId)
    logger.info('Verified saved plan', {
      planId,
      hasFinalItinerary: !!verifyPlan?.finalItinerary,
      finalItineraryKeys: verifyPlan?.finalItinerary ? Object.keys(verifyPlan.finalItinerary) : [],
      hasDetailedResults: !!verifyPlan?.finalItinerary?.detailedResults,
      detailedResultsType: verifyPlan?.finalItinerary?.detailedResults ? typeof verifyPlan.finalItinerary.detailedResults : 'undefined'
    })
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
