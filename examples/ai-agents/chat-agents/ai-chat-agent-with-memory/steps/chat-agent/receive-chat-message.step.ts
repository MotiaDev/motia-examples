import type { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { coreMiddleware } from '../../middlewares/core.middleware';

const bodySchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  message: z.string().min(1, 'Message cannot be empty'),
  userId: z.string().optional().default('anonymous'),
});

export const config: ApiRouteConfig = {
  name: 'ReceiveChatMessage',
  type: 'api',
  path: '/chat',
  method: 'POST',
  description: 'Receives chat messages and triggers AI agent processing',
  emits: ['process-ai-agent'],
  flows: ['ai-chat-agent'],
  bodySchema,
  middleware: [coreMiddleware],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      sessionId: z.string(),
      messageId: z.string(),
      status: z.string(),
    }),
    400: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['ReceiveChatMessage'] = async (req, { emit, logger, state, streams }) => {
  const { sessionId, message, userId } = bodySchema.parse(req.body);
  const messageId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  logger.info('Chat message received', { sessionId, messageId, userId });

  // Store user message in conversation history
  const conversationHistory = await state.get<Array<{ role: string; content: string; timestamp: string }>>(
    `conversation:${sessionId}`,
    'history'
  ) || [];

  conversationHistory.push({
    role: 'user',
    content: message,
    timestamp,
  });

  // Keep only last 20 messages for window buffer memory
  const windowedHistory = conversationHistory.slice(-20);
  await state.set(`conversation:${sessionId}`, 'history', windowedHistory);

  // Initialize stream response placeholder
  await streams.chatResponse.set(sessionId, messageId, {
    id: messageId,
    sessionId,
    role: 'assistant',
    content: '',
    status: 'processing',
    timestamp,
  });

  // Emit event for AI agent processing
  await emit({
    topic: 'process-ai-agent',
    data: {
      sessionId,
      messageId,
      message,
      userId,
      conversationHistory: windowedHistory,
      timestamp,
    },
  });

  logger.info('Chat message queued for processing', { sessionId, messageId });

  return {
    status: 200,
    body: {
      success: true,
      sessionId,
      messageId,
      status: 'processing',
    },
  };
};


