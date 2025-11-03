import { z } from 'zod'

export const TravelDatesSchema = z.object({
  start: z.string().describe('Start date of travel'),
  end: z.string().optional().describe('End date of travel'),
})

export const TravelPlanRequestSchema = z.object({
  name: z.string().describe('Traveler name'),
  destination: z.string().describe('Travel destination'),
  startingLocation: z.string().describe('Starting location/city'),
  duration: z.number().int().positive().describe('Trip duration in days'),
  travelDates: TravelDatesSchema,
  dateInputType: z.enum(['picker', 'text']).default('picker'),
  
  // Group details
  adults: z.number().int().min(1).default(1).describe('Number of adults'),
  children: z.number().int().min(0).default(0).describe('Number of children'),
  travelingWith: z.string().optional().describe('Who are you traveling with'),
  ageGroups: z.array(z.string()).default([]).describe('Age groups of travelers'),
  rooms: z.number().int().min(1).optional().describe('Number of rooms needed'),
  
  // Budget
  budget: z.number().positive().describe('Budget per person'),
  budgetCurrency: z.string().default('USD').describe('Budget currency'),
  budgetFlexible: z.boolean().default(false).describe('Is budget flexible'),
  
  // Preferences
  travelStyle: z.enum(['backpacker', 'comfort', 'luxury', 'eco-conscious']).default('comfort'),
  pace: z.array(z.number().int().min(0).max(5)).default([2]).describe('Preferred pace levels'),
  vibes: z.array(z.string()).default([]).describe('Travel vibes: relaxing, adventure, romantic, cultural, food-focused, nature, photography'),
  priorities: z.array(z.string()).default([]).describe('Top priorities for the trip'),
  interests: z.string().optional().describe('Specific interests'),
  
  // Context
  beenThereBefore: z.string().optional().describe('Have you been to this destination before'),
  lovedPlaces: z.string().optional().describe('Places you loved on previous trips'),
  additionalInfo: z.string().optional().describe('Additional information or special requests'),
})

export type TravelPlanRequest = z.infer<typeof TravelPlanRequestSchema>

export const TravelPlanResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  planId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
})

export type TravelPlanResponse = z.infer<typeof TravelPlanResponseSchema>

export const AgentResultSchema = z.object({
  agentName: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  result: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
})

export type AgentResult = z.infer<typeof AgentResultSchema>

export const TravelPlanStatusSchema = z.object({
  planId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  currentStep: z.string().optional(),
  progress: z.number().min(0).max(100).default(0),
  agents: z.array(AgentResultSchema).default([]),
  finalItinerary: z.any().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
})

export type TravelPlanStatus = z.infer<typeof TravelPlanStatusSchema>

export const DestinationResearchSchema = z.object({
  attractions: z.array(z.object({
    name: z.string(),
    description: z.string(),
    category: z.string(),
    estimatedDuration: z.string().optional(),
    bestTimeToVisit: z.string().optional(),
    tips: z.string().optional(),
  })),
  localInfo: z.string().optional(),
  hiddenGems: z.array(z.string()).optional(),
})

export type DestinationResearch = z.infer<typeof DestinationResearchSchema>

export const FlightRecommendationSchema = z.object({
  flights: z.array(z.object({
    airline: z.string(),
    departure: z.string(),
    arrival: z.string(),
    duration: z.string(),
    price: z.string(),
    stops: z.number(),
    bookingUrl: z.string().optional(),
  })),
})

export type FlightRecommendation = z.infer<typeof FlightRecommendationSchema>

export const HotelRecommendationSchema = z.object({
  hotels: z.array(z.object({
    name: z.string(),
    rating: z.string(),
    price: z.string(),
    address: z.string(),
    amenities: z.array(z.string()),
    description: z.string(),
    bookingUrl: z.string().optional(),
  })),
})

export type HotelRecommendation = z.infer<typeof HotelRecommendationSchema>

export const DiningRecommendationSchema = z.object({
  restaurants: z.array(z.object({
    name: z.string(),
    cuisine: z.string(),
    priceRange: z.string(),
    rating: z.string(),
    description: z.string(),
    specialties: z.array(z.string()).optional(),
    reservationRequired: z.boolean().optional(),
  })),
})

export type DiningRecommendation = z.infer<typeof DiningRecommendationSchema>

export const ItinerarySchema = z.object({
  days: z.array(z.object({
    day: z.number(),
    date: z.string(),
    morning: z.object({
      activities: z.array(z.string()),
      meals: z.array(z.string()).optional(),
    }),
    afternoon: z.object({
      activities: z.array(z.string()),
      meals: z.array(z.string()).optional(),
    }),
    evening: z.object({
      activities: z.array(z.string()),
      meals: z.array(z.string()).optional(),
    }),
    accommodation: z.string(),
    notes: z.string().optional(),
  })),
})

export type Itinerary = z.infer<typeof ItinerarySchema>

export const BudgetBreakdownSchema = z.object({
  transportation: z.object({
    flights: z.number(),
    local: z.number(),
  }),
  accommodation: z.number(),
  food: z.number(),
  activities: z.number(),
  shopping: z.number().optional(),
  contingency: z.number(),
  total: z.number(),
  currency: z.string(),
  perPerson: z.boolean(),
  optimization: z.string().optional(),
})

export type BudgetBreakdown = z.infer<typeof BudgetBreakdownSchema>

