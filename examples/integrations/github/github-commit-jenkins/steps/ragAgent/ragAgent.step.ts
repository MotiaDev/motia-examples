import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { createEmbedding, runChatCompletion } from '../../services/openai.service';
import { queryVectorStore } from '../../services/supabase.service';

const inputSchema = z.object({
  commitId: z.string(),
  content: z.string(),
  metadata: z.record(z.any())
});

export const config: EventConfig = {
  type: 'event',
  name: 'RagAgent',
  description: 'RAG agent to process GitHub commit with AI context',
  subscribes: ['run-rag-agent'],
  emits: ['append-sheet', 'slack-error'],
  input: inputSchema,
  flows: ['github-commit-jenkins']
};

export const handler: Handlers['RagAgent'] = async (input, { emit, logger }) => {
  try {
    const { commitId, content, metadata } = input;

    logger.info('Running RAG agent', { commitId });

    // Create embedding for the query
    const queryEmbedding = await createEmbedding(content);

    // Query Supabase vector store for relevant context
    const matchedDocs = await queryVectorStore(queryEmbedding, 0.78, 5);
    const vectorContext = matchedDocs.map(doc => doc.content);

    // Use OpenAI Chat Model with context
    const systemMessage = 'You are an assistant for GitHub Commit Jenkins';
    const userPrompt = `Process the following data for task 'GitHub Commit Jenkins':\n\nCommit Content: ${content}\n\nMetadata: ${JSON.stringify(metadata)}\n\nRelevant Context:\n${vectorContext.join('\n---\n')}`;

    const aiResponse = await runChatCompletion(systemMessage, userPrompt);

    logger.info('RAG agent completed', { commitId, responseLength: aiResponse.length });

    // Emit to Google Sheets logging
    await emit({
      topic: 'append-sheet',
      data: {
        commitId,
        status: aiResponse,
        timestamp: new Date().toISOString(),
        metadata
      }
    });

  } catch (error) {
    logger.error('RAG agent failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      commitId: input.commitId 
    });

    await emit({
      topic: 'slack-error',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'RagAgent',
        commitId: input.commitId
      }
    });
  }
};

