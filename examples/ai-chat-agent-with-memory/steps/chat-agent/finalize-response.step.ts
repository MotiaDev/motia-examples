import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  sessionId: z.string(),
  messageId: z.string(),
  response: z.string(),
  searchResults: z.array(z.object({
    title: z.string(),
    link: z.string(),
  })).optional(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  name: 'FinalizeResponse',
  type: 'event',
  description: 'Finalizes the AI agent response and updates stream',
  subscribes: ['agent-response-ready'],
  emits: [],
  input: inputSchema,
  flows: ['ai-chat-agent'],
};

export const handler: Handlers['FinalizeResponse'] = async (input, { logger, state, streams }) => {
  const { sessionId, messageId, response, searchResults, timestamp } = input;

  logger.info('Finalizing response', { sessionId, messageId });

  try {
    // Update stream with final response
    await streams.chatResponse.set(sessionId, messageId, {
      id: messageId,
      sessionId,
      role: 'assistant',
      content: response,
      status: 'complete',
      searchResults: searchResults || [],
      timestamp,
    });

    // Update conversation history with assistant response
    const conversationHistory = await state.get<Array<{ role: string; content: string; timestamp: string }>>(
      `conversation:${sessionId}`,
      'history'
    ) || [];

    conversationHistory.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 20 messages for window buffer memory
    await state.set(`conversation:${sessionId}`, 'history', conversationHistory.slice(-20));

    logger.info('Response finalized successfully', { sessionId, messageId });

  } catch (error) {
    logger.error('Failed to finalize response', {
      sessionId,
      messageId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};


