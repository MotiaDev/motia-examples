import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { AgentRequestSchema, AgentResponseSchema } from '../../../src/types/agent.types';
import type { AgentRequestState } from '../../../src/types/state.types';
import { randomUUID } from 'crypto';

const responseSchema = {
  202: z.object({
    request_id: z.string(),
    session_id: z.string(),
    status: z.string(),
    message: z.string(),
  }),
  400: z.object({
    error: z.string(),
    details: z.string().optional(),
  }),
  500: z.object({
    error: z.string(),
  }),
};

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'SimpleChatAgent',
  description: 'Simple chat agent powered by Google Gemini',
  path: '/agents/chat',
  method: 'POST',
  bodySchema: AgentRequestSchema,
  responseSchema,
  emits: ['process-agent-request'],
  flows: ['agent-chat'],
};

export const handler: Handlers['SimpleChatAgent'] = async (req, { emit, logger, state }) => {
  try {
    const request = AgentRequestSchema.parse(req.body);
    const requestId = randomUUID();
    const sessionId = request.session_id || randomUUID();
    
    logger.info('Starting simple chat agent request', {
      requestId,
      sessionId,
      agentType: request.agent_type,
    });
    
    // Store request in state
    const agentRequest: AgentRequestState = {
      ...request,
      requestId,
      timestamp: new Date().toISOString(),
      status: 'processing',
      created_at: new Date().toISOString(),
    };
    
    await state.set('agent-requests', requestId, agentRequest);
    
    // Emit event to process agent request asynchronously
    await emit({
      topic: 'process-agent-request',
      data: {
        requestId,
        sessionId,
        message: request.message,
        config: request.config,
        context: request.context,
      },
    });
    
    logger.info('Agent request queued for processing', { requestId, sessionId });
    
    return {
      status: 202, // Accepted - processing in background
      body: {
        request_id: requestId,
        session_id: sessionId,
        status: 'processing',
        message: 'Agent is processing your request. Poll GET /agents/chat/:requestId for results.',
      },
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Validation error in chat agent', {
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
    
    logger.error('Failed to initiate chat agent', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      status: 500,
      body: {
        error: 'Failed to initiate chat',
      },
    };
  }
};

