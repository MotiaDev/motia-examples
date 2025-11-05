import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Request schema
 */
const requestBodySchema = z.object({
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  budgetRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }),
  propertyType: z.string().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  minSquareFeet: z.number().optional(),
  selectedWebsites: z.array(z.string()).min(1, 'At least one website is required'),
  specialFeatures: z.array(z.string()).optional()
})

const responseSchema = z.object({
  searchId: z.string(),
  status: z.string(),
  message: z.string(),
  eventsTriggered: z.array(z.string())
})

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  name: 'StartPropertySearch',
  type: 'api',
  description: 'Initiate comprehensive property search with PARALLEL event-driven processing',
  path: '/api/property-search',
  method: 'POST',
  // Emit MULTIPLE events for parallel processing (Motia event-driven pattern!)
  emits: [
    { topic: 'property.scrape', label: 'Scrape Properties' },
    { topic: 'property.enrich', label: 'Enrich Property Data (conditional)', conditional: true },
    { topic: 'market.analyze', label: 'Analyze Market (conditional)', conditional: true },
    { topic: 'neighborhood.analyze', label: 'Analyze Neighborhoods (conditional)', conditional: true }
  ],
  flows: ['real-estate-search'],
  
  bodySchema: requestBodySchema,
  responseSchema: {
    200: responseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema
  }
}

/**
 * Handler - Triggers MULTIPLE parallel events (Motia event-driven pattern)
 */
export const handler: Handlers['StartPropertySearch'] = async (req, { logger, emit, streams }) => {
  try {
    const searchData = req.body
    
    logger.info('Property search initiated', {
      city: searchData.city,
      state: searchData.state,
      websites: searchData.selectedWebsites.length
    })
    
    // Generate unique search ID
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    // Build search URLs dynamically (inline for now)
    const searchUrls = searchData.selectedWebsites.map((website: string) => {
      const citySlug = searchData.city.toLowerCase().replace(/\s+/g, '-')
      const stateSlug = searchData.state.toLowerCase()
      
      // Build URLs based on website
      if (website.toLowerCase().includes('zillow')) {
        return `https://www.zillow.com/${citySlug}-${stateSlug}/`
      } else if (website.toLowerCase().includes('realtor')) {
        return `https://www.realtor.com/realestateandhomes-search/${citySlug}_${stateSlug}`
      } else if (website.toLowerCase().includes('redfin')) {
        return `https://www.redfin.com/city/${citySlug}`
      }
      return `https://www.zillow.com/${citySlug}-${stateSlug}/`
    })
    
    // Initialize progress
    await streams.propertySearchProgress.set('searches', searchId, {
      searchId,
      stage: 'initializing',
      progress: 0.1,
      message: 'Triggering parallel property search events...',
      timestamp: new Date().toISOString()
    })
    
    // Emit MULTIPLE events for PARALLEL processing (Motia pattern!)
    const eventsTriggered: string[] = []
    
    // Event 1: Property Scraping (ALWAYS)
    await emit({
      topic: 'property.scrape',
      data: {
        searchId,
        searchUrls,
        ...searchData
      }
    })
    eventsTriggered.push('property.scrape')
    
    // Event 2: Property Enrichment (conditional - if budget > 500k)
    if (searchData.budgetRange.max > 500000) {
      await emit({
        topic: 'property.enrich',
        data: {
          searchId,
          city: searchData.city,
          state: searchData.state
        }
      })
      eventsTriggered.push('property.enrich')
    }
    
    // Event 3: Market Analysis (conditional - always for investment insights)
    await emit({
      topic: 'market.analyze',
      data: {
        searchId,
        city: searchData.city,
        state: searchData.state,
        budgetRange: searchData.budgetRange
      }
    })
    eventsTriggered.push('market.analyze')
    
    // Event 4: Neighborhood Analysis (conditional - if specified)
    if (searchData.specialFeatures && searchData.specialFeatures.length > 0) {
      await emit({
        topic: 'neighborhood.analyze',
        data: {
          searchId,
          city: searchData.city,
          state: searchData.state,
          preferences: searchData.specialFeatures
        }
      })
      eventsTriggered.push('neighborhood.analyze')
    }
    
    logger.info('Property search events emitted', {
      searchId,
      eventsCount: eventsTriggered.length,
      events: eventsTriggered
    })
    
    return {
      status: 200,
      body: {
        searchId,
        status: 'processing',
        message: `Search initiated with ${eventsTriggered.length} parallel processes. Results will stream in real-time.`,
        eventsTriggered
      }
    }
    
  } catch (error) {
    logger.error('Failed to initiate property search', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return {
      status: 500,
      body: {
        error: 'Failed to initiate property search'
      }
    }
  }
}
