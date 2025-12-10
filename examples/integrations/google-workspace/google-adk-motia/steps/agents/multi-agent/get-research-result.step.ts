import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { MultiAgentResponseSchema } from '../../../src/types/agent.types';

const responseSchema = {
  200: MultiAgentResponseSchema,
  202: z.object({
    request_id: z.string(),
    status: z.string(),
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
  name: 'GetResearchResult',
  description: 'Get multi-agent research workflow result',
  path: '/agents/research/:requestId',
  method: 'GET',
  responseSchema,
  emits: [],
  flows: ['multi-agent-research'],
};

export const handler: Handlers['GetResearchResult'] = async (req, { logger, state }) => {
  try {
    const { requestId } = req.pathParams;
    
    if (!requestId) {
      return {
        status: 400,
        body: {
          error: 'Request ID is required',
        },
      };
    }
    
    logger.info('Fetching research result', { requestId });
    
    // Check if result is available
    const result = await state.get<any>('multi-agent-results', requestId);
    
    if (result) {
      logger.info('Research result found', { requestId });
      
      return {
        status: 200,
        body: result,
      };
    }
    
    // Check if request is still processing
    const request = await state.get<any>('multi-agent-requests', requestId);
    
    if (request) {
      if (request.status === 'error') {
        logger.error('Research request failed', { requestId, error: request.error });
        
        return {
          status: 500,
          body: {
            error: request.error || 'Research workflow failed',
          },
        };
      }
      
      logger.info('Research request still processing', {
        requestId,
        status: request.status,
      });
      
      return {
        status: 202,
        body: {
          request_id: requestId,
          status: request.status,
          message: 'Research workflow is still processing. Please check again in a few seconds.',
        },
      };
    }
    
    // Request not found
    logger.warn('Research request not found', { requestId });
    
    return {
      status: 404,
      body: {
        error: 'Request not found',
      },
    };
    
  } catch (error) {
    logger.error('Failed to fetch research result', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      status: 500,
      body: {
        error: 'Failed to fetch result',
      },
    };
  }
};

