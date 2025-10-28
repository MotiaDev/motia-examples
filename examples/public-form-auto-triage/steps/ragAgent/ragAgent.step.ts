import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { generateEmbeddings } from '../../services/cohere.service';
import { queryVectors } from '../../services/supabase.service';
import { generateRAGResponse } from '../../services/anthropic.service';

const inputSchema = z.object({
  requestId: z.string(),
  chunkCount: z.number(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  userInfo: z.object({
    email: z.string().optional(),
    name: z.string().optional(),
    id: z.string().optional()
  }).optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'RAGAgent',
  description: 'Queries vector store and generates triage response using Claude',
  subscribes: ['text.processed'],
  emits: [
    { topic: 'processing.complete', label: 'Success' },
    { topic: 'processing.failed', label: 'Error', conditional: true }
  ],
  input: inputSchema,
  flows: ['public-form-triage']
};

export const handler = async (input: z.infer<typeof inputSchema>, { emit, logger, state }: any) => {
  const { requestId, content, metadata, userInfo } = input;

  try {
    logger.info('Starting RAG processing', { requestId });

    // Step 1: Generate embedding for the query
    const queryResult = await generateEmbeddings([{ text: content }]);
    const queryEmbedding = queryResult.embeddings[0];

    logger.info('Query embedding generated', { requestId });

    // Step 2: Query similar vectors from Supabase
    const similarDocs = await queryVectors(queryEmbedding, 5);

    logger.info('Retrieved similar documents', { 
      requestId, 
      count: similarDocs.length 
    });

    // Step 3: Prepare context and prompt
    const context = similarDocs.map(doc => doc.content);
    
    const query = `Process the following data for task 'Public Form Auto Triage':\n\n${JSON.stringify({
      content,
      metadata,
      userInfo
    }, null, 2)}`;

    const systemMessage = 'You are an assistant for Public Form Auto Triage. Analyze the submitted form data and provide a structured triage response including: 1) Priority level (High/Medium/Low), 2) Category classification, 3) Recommended action, 4) Brief summary of the submission.';

    // Step 4: Generate response using Claude
    logger.info('Generating RAG response with Claude', { requestId });

    const response = await generateRAGResponse({
      query,
      context,
      systemMessage
    });

    logger.info('RAG response generated', { 
      requestId, 
      tokensUsed: response.tokensUsed 
    });

    // Step 5: Store the result
    await state.set('triage-results', requestId, {
      response: response.text,
      tokensUsed: response.tokensUsed,
      contextDocuments: similarDocs.length,
      processedAt: new Date().toISOString(),
      metadata,
      userInfo
    });

    // Emit success event
    await emit({
      topic: 'processing.complete',
      data: {
        requestId,
        result: response.text,
        tokensUsed: response.tokensUsed,
        metadata,
        userInfo
      }
    });

    logger.info('RAG processing completed', { requestId });

  } catch (error: any) {
    logger.error('RAG processing failed', { 
      requestId,
      error: error.message,
      stack: error.stack
    });

    // Emit error event
    await emit({
      topic: 'processing.failed',
      data: {
        requestId,
        stage: 'rag_processing',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });

    throw error;
  }
};

