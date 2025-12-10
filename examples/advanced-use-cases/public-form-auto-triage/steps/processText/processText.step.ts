import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { processText } from '../../services/cohere.service';
import { insertVectors } from '../../services/supabase.service';

const inputSchema = z.object({
  requestId: z.string(),
  contentPreview: z.string(),
  metadata: z.record(z.any()).optional(),
  userInfo: z.object({
    email: z.string().optional(),
    name: z.string().optional(),
    id: z.string().optional()
  }).optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessText',
  description: 'Splits text into chunks, generates embeddings, and stores in Supabase vector store',
  subscribes: ['form.submitted'],
  emits: [
    { topic: 'text.processed', label: 'Success' },
    { topic: 'processing.failed', label: 'Error', conditional: true }
  ],
  input: inputSchema,
  flows: ['public-form-triage']
};

export const handler: Handlers['ProcessText'] = async (input, { emit, logger, state }) => {
  const { requestId, metadata, userInfo } = input;

  try {
    logger.info('Starting text processing', { requestId });

    // Retrieve the full content from state
    const submission = await state.get('form-submissions', requestId);
    
    if (!submission || !submission.content) {
      throw new Error('Form submission not found in state');
    }

    const content = submission.content;

    logger.info('Processing text with Cohere', { 
      requestId, 
      contentLength: content.length 
    });

    // Step 1: Split text and generate embeddings
    const { embeddings, chunks } = await processText(content);

    logger.info('Text processed', { 
      requestId, 
      chunkCount: chunks.length,
      embeddingCount: embeddings.length
    });

    // Step 2: Prepare documents for vector storage
    const documents = chunks.map((chunk, idx) => ({
      content: chunk.text,
      embedding: embeddings[idx],
      metadata: {
        ...chunk.metadata,
        requestId,
        userInfo,
        formMetadata: metadata,
        createdAt: new Date().toISOString()
      }
    }));

    // Step 3: Insert into Supabase
    logger.info('Inserting vectors into Supabase', { 
      requestId, 
      documentCount: documents.length 
    });

    await insertVectors(documents);

    logger.info('Vectors stored successfully', { requestId });

    // Store processing results in state
    await state.set('processed-texts', requestId, {
      chunkCount: chunks.length,
      embeddingCount: embeddings.length,
      processedAt: new Date().toISOString()
    });

    // Emit event to continue to RAG processing
    await emit({
      topic: 'text.processed',
      data: {
        requestId,
        chunkCount: chunks.length,
        content,
        metadata,
        userInfo
      }
    });

    logger.info('Text processing completed', { requestId });

  } catch (error: any) {
    logger.error('Text processing failed', { 
      requestId,
      error: error.message,
      stack: error.stack
    });

    // Emit error event
    await emit({
      topic: 'processing.failed',
      data: {
        requestId,
        stage: 'text_processing',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });

    throw error;
  }
};

