import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { OpenAIService } from '../../src/services/openai.service';

const inputSchema = z.object({
  sessionId: z.string(),
  messageId: z.string(),
  message: z.string(),
  userId: z.string(),
  conversationHistory: z.array(z.object({
    role: z.string(),
    content: z.string(),
    timestamp: z.string(),
  })),
  timestamp: z.string(),
});

export const config: EventConfig = {
  name: 'ProcessAIAgent',
  type: 'event',
  description: 'Processes chat messages with AI agent using OpenAI GPT-4o-mini',
  subscribes: ['process-ai-agent'],
  emits: [
    { topic: 'web-search-required', label: 'Search needed', conditional: true },
    { topic: 'agent-response-ready', label: 'Response ready' },
  ],
  input: inputSchema,
  flows: ['ai-chat-agent'],
};

export const handler: Handlers['ProcessAIAgent'] = async (input, { emit, logger, state, streams }) => {
  const { sessionId, messageId, message, userId, conversationHistory, timestamp } = input;

  logger.info('AI Agent processing started', { sessionId, messageId });

  try {
    const openai = new OpenAIService();
    
    // Build messages array for OpenAI
    const systemPrompt = `You are a helpful AI assistant with web search capabilities. 
When you need current information, real-time data, or facts you're unsure about, respond with a JSON object:
{"action": "search", "query": "your search query"}

Otherwise, respond naturally to the user's message. Be concise, helpful, and friendly.

Current date: ${new Date().toISOString().split('T')[0]}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // First LLM call to determine if search is needed
    const initialResponse = await openai.chat(messages, {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
    });

    logger.info('Initial AI response received', { sessionId, messageId });

    // Check if AI wants to perform a web search
    let searchAction: { action: string; query: string } | null = null;
    try {
      const parsed = JSON.parse(initialResponse);
      if (parsed.action === 'search' && parsed.query) {
        searchAction = parsed;
      }
    } catch {
      // Not a JSON response, treat as direct answer
    }

    if (searchAction) {
      // Emit web search event
      logger.info('Web search required', { sessionId, messageId, query: searchAction.query });
      
      await streams.chatResponse.set(sessionId, messageId, {
        id: messageId,
        sessionId,
        role: 'assistant',
        content: `🔍 Searching for: "${searchAction.query}"...`,
        status: 'searching',
        timestamp,
      });

      await emit({
        topic: 'web-search-required',
        data: {
          sessionId,
          messageId,
          originalMessage: message,
          searchQuery: searchAction.query,
          conversationHistory,
          timestamp,
        },
      });
    } else {
      // Direct response - no search needed
      await emit({
        topic: 'agent-response-ready',
        data: {
          sessionId,
          messageId,
          response: initialResponse,
          timestamp,
        },
      });
    }

  } catch (error) {
    logger.error('AI Agent processing failed', { 
      sessionId, 
      messageId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    // Update stream with error status
    await streams.chatResponse.set(sessionId, messageId, {
      id: messageId,
      sessionId,
      role: 'assistant',
      content: 'Sorry, I encountered an error processing your request. Please try again.',
      status: 'error',
      timestamp,
    });

    // Store error response in conversation history
    const history = await state.get<Array<{ role: string; content: string; timestamp: string }>>(
      `conversation:${sessionId}`,
      'history'
    ) || [];

    history.push({
      role: 'assistant',
      content: 'Sorry, I encountered an error processing your request. Please try again.',
      timestamp: new Date().toISOString(),
    });

    await state.set(`conversation:${sessionId}`, 'history', history.slice(-20));
  }
};


