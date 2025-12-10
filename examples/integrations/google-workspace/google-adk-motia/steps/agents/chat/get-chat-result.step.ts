import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { AgentResponseSchema } from '../../../src/types/agent.types';
import type { AgentRequestState, AgentResultState } from '../../../src/types/state.types';

const responseSchema = {
  200: AgentResponseSchema,
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
  name: 'GetChatResult',
  description: 'Get chat agent response result',
  path: '/agents/chat/:requestId',
  method: 'GET',
  responseSchema,
  emits: [],
  flows: ['agent-chat'],
};

export const handler: Handlers['GetChatResult'] = async (req, { logger, state }) => {
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
    
    logger.info('Fetching chat result', { requestId });
    
    // Check if result is available
    const result = await state.get<AgentResultState>('agent-results', requestId);
    
    if (result) {
      logger.info('Chat result found', { requestId });
      
      return {
        status: 200,
        body: result,
      };
    }
    
    // Check if request is still processing
    const request = await state.get<AgentRequestState>('agent-requests', requestId);
    
    if (request) {
      if (request.status === 'error') {
        logger.error('Chat request failed', { requestId, error: request.error });
        
        return {
          status: 500,
          body: {
            error: request.error || 'Agent processing failed',
          },
        };
      }
      
      logger.info('Chat request still processing', {
        requestId,
        status: request.status,
      });
      
      return {
        status: 202, // Still processing
        body: {
          request_id: requestId,
          status: request.status,
          message: 'Chat is still being processed. Please check again in a few seconds.',
        },
      };
    }
    
    // Request not found
    logger.warn('Chat request not found', { requestId });
    
    return {
      status: 404,
      body: {
        error: 'Request not found',
      },
    };
    
  } catch (error) {
    logger.error('Failed to fetch chat result', {
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

