import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Response schema for property results
 */
const propertyResultsResponseSchema = z.object({
  searchId: z.string(),
  status: z.enum(['processing', 'completed', 'error']),
  progress: z.number().min(0).max(1),
  properties: z.array(z.any()).optional(),
  marketAnalysis: z.record(z.any()).optional(),
  totalCount: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional()
})

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  name: 'GetPropertyResults',
  type: 'api',
  description: 'Retrieves the results of a property search by search ID',
  path: '/api/property-search/:searchId',
  method: 'GET',
  emits: [],
  flows: ['real-estate-search'],
  
  responseSchema: {
    200: propertyResultsResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
}

/**
 * Handler for retrieving property search results
 * 
 * This handler:
 * 1. Retrieves the search progress from streams
 * 2. Retrieves the full results if completed
 * 3. Returns current status and data
 */
export const handler: Handlers['GetPropertyResults'] = async (req, { logger, streams, state }) => {
  try {
    const { searchId } = req.pathParams
    
    if (!searchId) {
      return {
        status: 400,
        body: {
          error: 'Search ID is required'
        }
      }
    }
    
    logger.info('Retrieving property results', { searchId })
    
    // Get progress information
    const progressItem = await streams.propertySearchProgress.get('searches', searchId)
    
    if (!progressItem) {
      return {
        status: 404,
        body: {
          error: 'Search not found. The search may have expired or the ID is invalid.'
        }
      }
    }
    
    // Stream data is directly on the item (not nested under .data)
    const progress = progressItem
    
    // Get full results if available
    const resultsItem = await streams.propertyResults.get('searches', searchId)
    const results = resultsItem
    
    // Build response based on current stage
    if (progress?.stage === 'completed' && results) {
      return {
        status: 200,
        body: {
          searchId,
          status: 'completed',
          progress: 1.0,
          properties: results.properties || [],
          marketAnalysis: results.marketAnalysis || {},
          totalCount: results.totalCount || 0,
          message: 'Property search completed successfully'
        }
      }
    } else if (progress?.stage === 'error') {
      return {
        status: 200,
        body: {
          searchId,
          status: 'error',
          progress: progress.progress || 0,
          message: progress.message || 'An error occurred during property search',
          error: progress.message || 'Search failed'
        }
      }
    } else if (results) {
      // Has results but still processing (might be waiting for AI)
      return {
        status: 200,
        body: {
          searchId,
          status: results.status || 'processing',
          progress: progress.progress || 0,
          properties: results.properties || [],
          totalCount: results.totalCount || 0,
          message: progress.message || results.message || 'Processing...'
        }
      }
    } else {
      // Still processing
      return {
        status: 200,
        body: {
          searchId,
          status: 'processing',
          progress: progress.progress || 0,
          message: progress.message || 'Processing...'
        }
      }
    }
    
  } catch (error) {
    logger.error('Failed to retrieve property results', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return {
      status: 500,
      body: {
        error: 'Failed to retrieve property results'
      }
    }
  }
}

