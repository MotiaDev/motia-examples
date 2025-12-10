import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { SerpAPIService } from '../../src/services/serpapi.service';
import { OpenAIService } from '../../src/services/openai.service';

const inputSchema = z.object({
  sessionId: z.string(),
  messageId: z.string(),
  originalMessage: z.string(),
  searchQuery: z.string(),
  conversationHistory: z.array(z.object({
    role: z.string(),
    content: z.string(),
    timestamp: z.string(),
  })),
  timestamp: z.string(),
});

export const config: EventConfig = {
  name: 'WebSearch',
  type: 'event',
  description: 'Performs web search using SerpAPI and synthesizes response',
  subscribes: ['web-search-required'],
  emits: ['agent-response-ready'],
  input: inputSchema,
  flows: ['ai-chat-agent'],
};

export const handler: Handlers['WebSearch'] = async (input, { emit, logger, streams }) => {
  const { sessionId, messageId, originalMessage, searchQuery, conversationHistory, timestamp } = input;

  logger.info('Web search started', { sessionId, messageId, searchQuery });

  try {
    const serpapi = new SerpAPIService();
    const openai = new OpenAIService();

    // Perform web search
    const searchResults = await serpapi.search(searchQuery);

    logger.info('Search results received', { 
      sessionId, 
      messageId, 
      resultsCount: searchResults.length 
    });

    // Update stream with search progress
    await streams.chatResponse.set(sessionId, messageId, {
      id: messageId,
      sessionId,
      role: 'assistant',
      content: `🔍 Found ${searchResults.length} results. Analyzing...`,
      status: 'analyzing',
      timestamp,
    });

    // Build context from search results
    const searchContext = searchResults
      .slice(0, 5)
      .map((result, i) => `[${i + 1}] ${result.title}\n${result.snippet}\nSource: ${result.link}`)
      .join('\n\n');

    // Synthesize response with search results
    const synthesisPrompt = `You are a helpful AI assistant. Based on the web search results below, provide a comprehensive and accurate answer to the user's question.

User's question: ${originalMessage}

Web search results:
${searchContext}

Instructions:
- Synthesize the information from the search results
- Cite sources when providing specific information using [1], [2], etc.
- If the search results don't contain relevant information, say so
- Be concise but thorough
- Format your response for easy reading`;

    const messages = [
      { role: 'system' as const, content: synthesisPrompt },
      ...conversationHistory.slice(-6).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    const synthesizedResponse = await openai.chat(messages, {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1500,
    });

    logger.info('Response synthesized', { sessionId, messageId });

    // Emit response ready event
    await emit({
      topic: 'agent-response-ready',
      data: {
        sessionId,
        messageId,
        response: synthesizedResponse,
        searchResults: searchResults.slice(0, 5).map(r => ({
          title: r.title,
          link: r.link,
        })),
        timestamp,
      },
    });

  } catch (error) {
    logger.error('Web search failed', { 
      sessionId, 
      messageId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    // Fallback: emit response without search
    await emit({
      topic: 'agent-response-ready',
      data: {
        sessionId,
        messageId,
        response: `I tried to search for information but encountered an error. Based on my knowledge, I'll try to help with your question: "${originalMessage}"\n\nPlease note that I couldn't verify this with current web data.`,
        timestamp,
      },
    });
  }
};


