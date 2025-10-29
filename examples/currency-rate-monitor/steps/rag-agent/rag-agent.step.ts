import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  requestId: z.string(),
  query: z.string(),
  metadata: z.record(z.any()).optional()
});

export const config: EventConfig = {
  type: 'event',
  name: 'RAGAgent',
  description: 'RAG Agent for Currency Rate Monitor with vector context and memory',
  subscribes: ['rag.process'],
  emits: [
    'sheets.append',
    { topic: 'slack.error', conditional: true }
  ],
  input: inputSchema,
  flows: ['currency-rate-monitor']
};

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const handler: Handlers['RAGAgent'] = async (input, { emit, logger, state }) => {
  const { requestId, query, metadata } = input;
  
  logger.info('Processing RAG query', { requestId, query });

  try {
    // Step 1: Generate embedding for the query
    logger.info('Generating query embedding', { requestId });
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query
      })
    });

    if (!embeddingResponse.ok) {
      throw new Error(`OpenAI Embedding API error: ${embeddingResponse.statusText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Step 2: Query Weaviate for relevant context
    logger.info('Querying Weaviate for context', { requestId });
    const weaviateUrl = process.env.WEAVIATE_URL || 'http://localhost:8080';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (weaviateApiKey) {
      headers['Authorization'] = `Bearer ${weaviateApiKey}`;
    }

    const weaviateResponse = await fetch(`${weaviateUrl}/v1/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `{
          Get {
            CurrencyRateMonitor(
              nearVector: {
                vector: ${JSON.stringify(queryEmbedding)}
              }
              limit: 5
            ) {
              content
              requestId
              chunkIndex
              metadata
            }
          }
        }`
      })
    });

    if (!weaviateResponse.ok) {
      throw new Error(`Weaviate API error: ${weaviateResponse.statusText}`);
    }

    const weaviateData = await weaviateResponse.json();
    const contextChunks = weaviateData.data?.Get?.CurrencyRateMonitor || [];
    const context = contextChunks.map((chunk: any) => chunk.content).join('\n\n');

    // Step 3: Get conversation history from state (window memory)
    const conversationKey = `conversation_${requestId}`;
    let conversationHistory: Message[] = await state.get('conversations', conversationKey) || [];
    
    // Keep only last 5 messages (window memory)
    conversationHistory = conversationHistory.slice(-5);

    // Step 4: Build messages for ChatGPT
    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are an assistant for Currency Rate Monitor. Use the provided context to answer questions accurately.'
      },
      ...conversationHistory,
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${query}`
      }
    ];

    // Step 5: Call OpenAI Chat API
    logger.info('Calling OpenAI Chat API', { requestId });
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!chatResponse.ok) {
      throw new Error(`OpenAI Chat API error: ${chatResponse.statusText}`);
    }

    const chatData = await chatResponse.json();
    const assistantMessage = chatData.choices[0].message.content;

    // Step 6: Update conversation history
    conversationHistory.push(
      { role: 'user', content: query },
      { role: 'assistant', content: assistantMessage }
    );
    await state.set('conversations', conversationKey, conversationHistory);

    logger.info('RAG processing complete', { requestId });

    // Emit to Google Sheets for logging
    await emit({
      topic: 'sheets.append',
      data: {
        requestId,
        query,
        response: assistantMessage,
        timestamp: new Date().toISOString(),
        status: 'success',
        metadata
      }
    });

  } catch (error) {
    logger.error('RAG processing failed', { 
      requestId,
      error: (error as Error).message 
    });

    // Emit to Slack for error alerting
    await emit({
      topic: 'slack.error',
      data: {
        requestId,
        query,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }
    });

    throw error;
  }
};

