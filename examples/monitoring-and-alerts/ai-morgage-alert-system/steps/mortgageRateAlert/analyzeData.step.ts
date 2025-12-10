import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { generateEmbeddings, generateChatCompletion } from '../../src/services/openai';
import { queryVectorSearch } from '../../src/services/couchbase';
import type { ChatCompletionMessage } from '../../src/services/openai';

const inputSchema = z.object({
  dataId: z.string(),
  query: z.string()
});

export const config: EventConfig = {
  name: 'AnalyzeData',
  type: 'event',
  description: 'Query Couchbase vector search and analyze mortgage data with AI agent using memory',
  subscribes: ['query-and-analyze'],
  emits: ['log-results', 'send-analysis'],
  input: inputSchema,
  flows: ['mortgage-rate-alert']
};

export const handler: Handlers['AnalyzeData'] = async (input, { emit, logger, state }) => {
  const { dataId, query } = input;
  
  logger.info('Starting analysis', { dataId, query });
  
  // Get the chunks we just stored (for immediate access, bypassing FTS lag)
  const currentChunks = await state.get<string[]>('current-chunks', dataId) || [];
  
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const cbConnectionString = process.env.COUCHBASE_CONNECTION_STRING;
  const cbDataApiUrl = process.env.COUCHBASE_DATA_API_URL;
  const cbUsername = process.env.COUCHBASE_USERNAME;
  const cbPassword = process.env.COUCHBASE_PASSWORD;
  const cbBucket = process.env.COUCHBASE_BUCKET || 'morgage-data';
  const cbScope = process.env.COUCHBASE_SCOPE || '_default';
  const cbIndexName = process.env.COUCHBASE_INDEX || 'mortgage-vector-index';
  
  if (!openaiApiKey || !cbConnectionString || !cbDataApiUrl || !cbUsername || !cbPassword) {
    logger.error('Missing required configuration', {
      hasOpenAI: !!openaiApiKey,
      hasCouchbase: !!(cbConnectionString && cbDataApiUrl && cbUsername && cbPassword)
    });
    throw new Error('Missing required environment variables');
  }
  
  const [queryEmbedding] = await generateEmbeddings([query], openaiApiKey);
  
  logger.info('Query embedding generated', { dataId });
  
  const results = await queryVectorSearch(
    queryEmbedding,
    {
      connectionString: cbConnectionString,
      dataApiUrl: cbDataApiUrl,
      username: cbUsername,
      password: cbPassword,
      bucketName: cbBucket,
      scopeName: cbScope,
      indexName: cbIndexName
    },
    5
  );
  
  logger.info('Retrieved relevant contexts', { 
    dataId, 
    resultCount: results.length 
  });
  
  // Prepend current chunks (just stored) to ensure freshest data is analyzed
  // This bypasses FTS indexing lag
  const allTexts = [
    ...currentChunks.map(chunk => `[LATEST] ${chunk}`),
    ...results.map(result => result.text)
  ];
  
  const context = allTexts
    .map((text, index) => `[${index + 1}] ${text}`)
    .join('\n\n');
  
  // Log the actual context being sent to AI for debugging
  logger.info('Context for AI analysis', {
    dataId,
    currentChunksCount: currentChunks.length,
    searchResultsCount: results.length,
    contextLength: context.length,
    contextPreview: context.substring(0, 500)
  });
  
  const conversationHistory = await state.get<ChatCompletionMessage[]>(
    'conversation-history',
    dataId
  ) || [];
  
  const messages: ChatCompletionMessage[] = [
    {
      role: 'system',
      content: `You are a mortgage rate analysis assistant with access to a real-time vector database of mortgage rate information.

CRITICAL INSTRUCTIONS:
- You MUST analyze ONLY the mortgage data provided in the Context section below
- NEVER say "I don't have access" or "I can't provide current rates" - the context IS your data source
- Extract specific rate numbers, lenders, and terms from the context
- If rates are mentioned (e.g., "6.5%", "5.875%"), report them with specifics
- Compare rates if multiple data points are available
- If the context has limited info, analyze what IS there rather than what isn't
- Be specific: mention actual percentages, lenders, and dates from the context`
    },
    ...conversationHistory,
    {
      role: 'user',
      content: `Context from Mortgage Rate Database (${results.length} relevant documents):
${context}

User Query: ${query}

Analyze the mortgage rate data above and provide specific insights based on the information retrieved from the database.`
    }
  ];
  
  const analysis = await generateChatCompletion(messages, openaiApiKey, {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  });
  
  logger.info('Analysis completed', { dataId });
  
  const updatedHistory: ChatCompletionMessage[] = [
    ...conversationHistory,
    { role: 'user', content: query },
    { role: 'assistant', content: analysis }
  ];
  
  const recentHistory = updatedHistory.slice(-10);
  await state.set('conversation-history', dataId, recentHistory);
  
  const result = {
    dataId,
    query,
    analysis,
    contextCount: results.length,
    timestamp: new Date().toISOString()
  };
  
  await state.set('analysis-results', dataId, result);
  
  await emit({
    topic: 'log-results',
    data: result
  });
  
  await emit({
    topic: 'send-analysis',
    data: result
  });
  
  logger.info('Analysis result stored, logged, and email sent', { dataId });
};

