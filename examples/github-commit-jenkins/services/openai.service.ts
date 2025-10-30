import OpenAI from 'openai';

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Create embeddings for text using OpenAI
 * @param text - The text to create embeddings for
 * @returns Array of embedding values
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw new Error('Failed to create embedding');
  }
}

/**
 * Run chat completion with OpenAI
 * @param systemMessage - The system message to set the context
 * @param userPrompt - The user prompt
 * @param conversationHistory - Optional conversation history
 * @returns The AI response text
 */
export async function runChatCompletion(
  systemMessage: string,
  userPrompt: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const client = getOpenAIClient();
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessage },
    ];

    if (conversationHistory) {
      messages.push(...conversationHistory);
    }

    messages.push({ role: 'user', content: userPrompt });

    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error running chat completion:', error);
    throw new Error('Failed to run chat completion');
  }
}

/**
 * Create embeddings in batch for multiple texts
 * @param texts - Array of texts to create embeddings for
 * @returns Array of embedding arrays
 */
export async function createEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();
  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error creating batch embeddings:', error);
    throw new Error('Failed to create batch embeddings');
  }
}

