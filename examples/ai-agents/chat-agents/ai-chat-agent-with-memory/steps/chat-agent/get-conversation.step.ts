import type { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { coreMiddleware } from '../../middlewares/core.middleware';

export const config: ApiRouteConfig = {
  name: 'GetConversation',
  type: 'api',
  path: '/chat/:sessionId',
  method: 'GET',
  description: 'Retrieves conversation history for a session',
  emits: [],
  flows: ['ai-chat-agent'],
  middleware: [coreMiddleware],
  responseSchema: {
    200: z.object({
      sessionId: z.string(),
      messages: z.array(z.object({
        role: z.string(),
        content: z.string(),
        timestamp: z.string(),
      })),
    }),
    404: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['GetConversation'] = async (req, { logger, state }) => {
  const { sessionId } = req.pathParams;

  logger.info('Fetching conversation', { sessionId });

  const conversationHistory = await state.get<Array<{ role: string; content: string; timestamp: string }>>(
    `conversation:${sessionId}`,
    'history'
  );

  if (!conversationHistory) {
    return {
      status: 200,
      body: {
        sessionId,
        messages: [],
      },
    };
  }

  return {
    status: 200,
    body: {
      sessionId,
      messages: conversationHistory,
    },
  };
};


