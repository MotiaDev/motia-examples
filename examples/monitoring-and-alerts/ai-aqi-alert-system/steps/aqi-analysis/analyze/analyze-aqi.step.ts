import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { AnalysisRequestSchema, AnalysisResponseSchema } from '../../../src/types/aqi.types';
import type { AQIRequest } from '../../../src/types/state.types';
import { randomUUID } from 'crypto';

const responseSchema = {
  200: AnalysisResponseSchema,
  400: z.object({ 
    error: z.string(),
    details: z.string().optional(),
  }),
  500: z.object({ 
    error: z.string(),
    trace_id: z.string().optional(),
  }),
};

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'AnalyzeAQI',
  description: 'Analyze air quality for a location and provide health recommendations',
  path: '/aqi/analyze',
  method: 'POST',
  bodySchema: AnalysisRequestSchema,
  responseSchema,
  emits: ['fetch-aqi-data'],
  flows: ['aqi-analysis'],
};

export const handler: Handlers['AnalyzeAQI'] = async (req, { emit, logger, state }) => {
  try {
    const request = AnalysisRequestSchema.parse(req.body);
    const requestId = randomUUID();
    
    logger.info('Starting AQI analysis', { 
      requestId,
      location: request.location,
      userId: request.user_id,
    });
    
    // Store request in state for access by event steps
    const aqiRequest: AQIRequest = {
      ...request,
      requestId,
      timestamp: new Date().toISOString(),
      status: 'processing',
      created_at: new Date().toISOString(),
    };
    
    await state.set('aqi-requests', requestId, aqiRequest);
    
    // Emit event to process health recommendations (after AQI data is fetched)
    await emit({
      topic: 'fetch-aqi-data',
      data: {
        requestId,
        location: request.location,
        include_trends: request.include_trends,
      },
    });
    
    logger.info('AQI analysis background processing initiated', { requestId });
    
    // Return request ID for polling
    return {
      status: 202, // Accepted - processing in background
      body: {
        request_id: requestId,
        status: 'processing',
        message: 'Analysis in progress. Poll GET /aqi/analyze/:requestId for results.',
        location: request.location,
      },
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Validation error in AQI analysis', { 
        error: error.message,
        issues: error.issues,
      });
      
      return {
        status: 400,
        body: {
          error: 'Invalid request data',
          details: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        },
      };
    }
    
    logger.error('Failed to initiate AQI analysis', { 
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      status: 500,
      body: {
        error: 'Failed to initiate analysis',
      },
    };
  }
};

