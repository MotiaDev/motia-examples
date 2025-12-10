import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { AnalysisResponseSchema } from '../../../src/types/aqi.types';
import type { AQIResult, AQIRequest } from '../../../src/types/state.types';

const responseSchema = {
  200: AnalysisResponseSchema,
  202: z.object({
    request_id: z.string(),
    status: z.enum(['processing', 'fetching_data', 'generating_recommendations']),
    message: z.string(),
  }),
  404: z.object({ 
    error: z.string(),
  }),
  500: z.object({ 
    error: z.string(),
  }),
};

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetAnalysisResult',
  description: 'Get the result of an AQI analysis request',
  path: '/aqi/analyze/:requestId',
  method: 'GET',
  responseSchema,
  emits: [],
  flows: ['aqi-analysis'],
};

export const handler: Handlers['GetAnalysisResult'] = async (req, { logger, state }) => {
  try {
    const { requestId } = req.pathParams;
    
    logger.info('Fetching analysis result', { requestId });
    
    // Check if analysis is complete
    const result = await state.get<AQIResult>('aqi-results', requestId);
    
    if (result) {
      logger.info('Analysis result found', { requestId, status: 'completed' });
      
      return {
        status: 200,
        body: result,
      };
    }
    
    // Check if request is still processing
    const request = await state.get<AQIRequest>('aqi-requests', requestId);
    
    if (request) {
      logger.info('Analysis still processing', { 
        requestId, 
        status: request.status,
      });
      
      return {
        status: 202,
        body: {
          request_id: requestId,
          status: request.status || 'processing',
          message: 'Analysis is still in progress. Please check again in a few seconds.',
        },
      };
    }
    
    // Request not found
    logger.warn('Analysis request not found', { requestId });
    
    return {
      status: 404,
      body: {
        error: 'Analysis request not found',
      },
    };
    
  } catch (error) {
    logger.error('Failed to fetch analysis result', { 
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      status: 500,
      body: {
        error: 'Failed to fetch analysis result',
      },
    };
  }
};

