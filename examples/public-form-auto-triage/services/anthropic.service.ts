import Anthropic from '@anthropic-ai/sdk';

let anthropic: Anthropic;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not configured. Please set ANTHROPIC_API_KEY in your .env file');
    }
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

export interface RAGContext {
  query: string;
  context: string[];
  systemMessage?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface RAGResponse {
  text: string;
  tokensUsed: number;
}

/**
 * Generate a response using Claude with RAG context
 */
export async function generateRAGResponse(config: RAGContext): Promise<RAGResponse> {
  const {
    query,
    context,
    systemMessage = 'You are an assistant for Public Form Auto Triage',
    conversationHistory = []
  } = config;

  // Build the prompt with context
  const contextText = context.length > 0
    ? `\n\nRelevant context:\n${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
    : '';

  const userMessage = `${query}${contextText}`;

  // Build messages array
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: 'user' as const,
      content: userMessage
    }
  ];

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemMessage,
    messages
  });

  const textContent = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as Anthropic.TextBlock).text)
    .join('\n');

  return {
    text: textContent,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens
  };
}

/**
 * Simple chat completion without RAG context
 */
export async function chat(message: string, systemMessage?: string): Promise<string> {
  const response = await generateRAGResponse({
    query: message,
    context: [],
    systemMessage
  });
  
  return response.text;
}

