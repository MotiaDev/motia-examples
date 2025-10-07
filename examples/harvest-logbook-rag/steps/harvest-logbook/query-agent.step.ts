/**
 * Query Agent Event Step
 * Uses AI agent with vector store retrieval to answer queries
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { HarvestLogbookService } from '../../src/services/harvest-logbook';
import { ConversationMessage } from '../../src/services/harvest-logbook/types';

const inputSchema = z.object({
  entryId: z.string(),
  query: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'QueryAgent',
  description: 'Queries the AI agent with vector store context to generate responses',
  subscribes: ['query-agent'],
  emits: ['log-to-sheets'],
  input: inputSchema,
  flows: ['harvest-logbook']
};

export const handler: Handlers['QueryAgent'] = async (input, { emit, logger, state }) => {
  try {
    const { entryId, query, conversationHistory } = input;

    logger.info('Querying AI agent', {
      entryId,
      query: query.substring(0, 100)
    });

    // Query the agent with RAG
    const agentResponse = await HarvestLogbookService.queryWithAgent({
      query,
      conversationHistory: conversationHistory as ConversationMessage[]
    });

    // Store the response in state
    await state.set('agent-responses', entryId, {
      query,
      response: agentResponse.response,
      sources: agentResponse.sources,
      timestamp: agentResponse.timestamp
    });

    logger.info('Agent query completed', {
      entryId,
      responseLength: agentResponse.response.length,
      sourcesCount: agentResponse.sources?.length || 0
    });

    // Emit event to log to Google Sheets
    await emit({
      topic: 'log-to-sheets',
      data: {
        entryId,
        query,
        response: agentResponse.response,
        sources: agentResponse.sources
      }
    });

  } catch (error) {
    logger.error('Failed to query agent', {
      entryId: input.entryId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};
