import type { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { coreMiddleware } from '../../middlewares/core.middleware';

export const config: ApiRouteConfig = {
  name: 'ClearConversation',
  type: 'api',
  path: '/chat/:sessionId',
  method: 'DELETE',
  description: 'Clears conversation history for a session',
  emits: [],
  flows: ['ai-chat-agent'],
  middleware: [coreMiddleware],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
};

export const handler: Handlers['ClearConversation'] = async (req, { logger, state }) => {
  const { sessionId } = req.pathParams;

  logger.info('Clearing conversation', { sessionId });

  await state.delete(`conversation:${sessionId}`, 'history');

  return {
    status: 200,
    body: {
      success: true,
      message: `Conversation ${sessionId} cleared successfully`,
    },
  };
};


