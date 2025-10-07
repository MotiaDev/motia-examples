/**
 * OpenAI Chat Service
 * Alternative to HuggingFace for LLM chat completions using OpenAI
 */

import { ConversationMessage } from './types';

export interface OpenAIChatConfig {
  apiKey: string;
  model?: string;
}

export interface OpenAIChatCompletionParams {
  messages: ConversationMessage[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export class OpenAIChatService {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(config: OpenAIChatConfig) {
    this.apiKey = config.apiKey;
    // Default to GPT-3.5-turbo (fast and cost-effective)
    this.model = config.model || 'gpt-3.5-turbo';
  }

  /**
   * Generate chat completion using OpenAI
   */
  async chatCompletion(params: OpenAIChatCompletionParams): Promise<string> {
    const { messages, temperature = 0.7, maxTokens = 500, systemPrompt } = params;

    // Build messages array
    const chatMessages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      chatMessages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add conversation messages
    for (const msg of messages) {
      chatMessages.push({
        role: msg.role,
        content: msg.content
      });
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: chatMessages,
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Chat API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Generate response with retrieved context (RAG)
   */
  async generateWithContext(
    query: string,
    context: string[],
    conversationHistory: ConversationMessage[] = []
  ): Promise<string> {
    const contextText = context.join('\n\n');
    
    const systemPrompt = `You are a helpful assistant for a harvest logbook system. 
Use the following context to answer the user's question accurately and concisely.
If the context doesn't contain relevant information, say so and provide a general response.

Context:
${contextText}`;

    const messages: ConversationMessage[] = [
      ...conversationHistory,
      { role: 'user', content: query }
    ];

    return this.chatCompletion({
      messages,
      systemPrompt
    });
  }
}

// Singleton instance factory
let openAIChatInstance: OpenAIChatService | null = null;

export function getOpenAIChatService(): OpenAIChatService {
  if (!openAIChatInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_CHAT_MODEL; // Optional: allow custom model
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openAIChatInstance = new OpenAIChatService({ apiKey, model });
  }
  return openAIChatInstance;
}
