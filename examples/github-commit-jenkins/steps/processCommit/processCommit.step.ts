import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { createEmbeddingsBatch } from '../../services/openai.service';
import { storeEmbeddings } from '../../services/supabase.service';

const inputSchema = z.object({
  commitId: z.string(),
  content: z.string(),
  metadata: z.record(z.any())
});

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessCommit',
  description: 'Process commit data: split text and create embeddings',
  subscribes: ['process-commit'],
  emits: ['run-rag-agent', 'slack-error'],
  input: inputSchema,
  flows: ['github-commit-jenkins']
};

export const handler: Handlers['ProcessCommit'] = async (input, { emit, logger }) => {
  try {
    const { commitId, content, metadata } = input;

    logger.info('Processing commit', { commitId });

    // Text splitting logic (chunk size: 400, overlap: 40)
    const chunks = splitText(content, 400, 40);
    
    // Create embeddings for each chunk
    const embeddings = await createEmbeddingsBatch(chunks);

    // Store embeddings in Supabase vector store
    await storeEmbeddings(commitId, chunks, embeddings);

    logger.info('Embeddings created and stored', { 
      commitId, 
      chunkCount: chunks.length 
    });

    // Trigger RAG agent
    await emit({
      topic: 'run-rag-agent',
      data: {
        commitId,
        content,
        metadata
      }
    });

  } catch (error) {
    logger.error('Commit processing failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      commitId: input.commitId 
    });

    await emit({
      topic: 'slack-error',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'ProcessCommit',
        commitId: input.commitId
      }
    });
  }
};

// Helper function to split text into chunks
function splitText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}

