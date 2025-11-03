const API_BASE = '/api/travel-plan'

export interface TravelPlanRequest {
  name: string
  destination: string
  startingLocation: string
  duration: number
  travelDates: {
    start: string
    end?: string
  }
  dateInputType?: 'picker' | 'text'
  adults: number
  children?: number
  travelingWith?: string
  ageGroups?: string[]
  rooms?: number
  budget: number
  budgetCurrency?: string
  budgetFlexible?: boolean
  travelStyle?: 'backpacker' | 'comfort' | 'luxury' | 'eco-conscious'
  pace?: number[]
  vibes?: string[]
  priorities?: string[]
  interests?: string
  beenThereBefore?: string
  lovedPlaces?: string
  additionalInfo?: string
}

export interface TravelPlanResponse {
  success: boolean
  message: string
  planId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface AgentResult {
  agentName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
  error?: string
  timestamp: string
}

export interface TravelPlanStatus {
  planId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  currentStep?: string
  progress: number
  agents: AgentResult[]
  finalItinerary?: {
    summary: string
    detailedResults: {
      destination?: string
      flights?: string
      hotels?: string
      dining?: string
      itinerary?: string
      budget?: string
    }
  }
  startedAt?: string
  completedAt?: string
  error?: string
}

export async function triggerTravelPlan(request: TravelPlanRequest): Promise<TravelPlanResponse> {
  const response = await fetch(`${API_BASE}/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ request }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to trigger travel plan')
  }
  
  return response.json()
}

export async function getTravelPlanStatus(planId: string): Promise<TravelPlanStatus> {
  const response = await fetch(`${API_BASE}/status/${planId}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch travel plan status')
  }
  
  return response.json()
}

