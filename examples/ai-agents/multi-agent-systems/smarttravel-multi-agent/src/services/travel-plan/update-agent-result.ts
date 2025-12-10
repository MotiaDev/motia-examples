import type { AgentResult, TravelPlanStatus } from '../../../types/travel-plan'
import type { InternalStateManager } from 'motia'

export async function updateAgentResult(
  state: InternalStateManager,
  planId: string,
  agentResult: AgentResult
): Promise<void> {
  const plan = await state.get<TravelPlanStatus>('travel-plans', planId)
  if (plan) {
    const existingIndex = plan.agents.findIndex((a: AgentResult) => a.agentName === agentResult.agentName)
    if (existingIndex >= 0) {
      plan.agents[existingIndex] = agentResult
    } else {
      plan.agents.push(agentResult)
    }
    await state.set('travel-plans', planId, plan)
  }
}

