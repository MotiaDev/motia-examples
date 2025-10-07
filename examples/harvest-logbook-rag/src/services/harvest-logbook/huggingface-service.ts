/**
 * HuggingFace Service
 * Handles LLM chat completions using HuggingFace Inference API
 */

import { ConversationMessage } from './types';

export interface HuggingFaceConfig {
  apiKey: string;
  model?: string;
}

export interface ChatCompletionParams {
  messages: ConversationMessage[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export class HuggingFaceService {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api-inference.huggingface.co/models';

  constructor(config: HuggingFaceConfig) {
    this.apiKey = config.apiKey;
    // Default to a popular chat model
    this.model = config.model || 'mistralai/Mistral-7B-Instruct-v0.2';
  }

  /**
   * Generate chat completion
   */
  async chatCompletion(params: ChatCompletionParams): Promise<string> {
    const { messages, temperature = 0.7, maxTokens = 500, systemPrompt } = params;

    // Format messages into a prompt
    const prompt = this.formatMessages(messages, systemPrompt);

    const response = await fetch(`${this.baseUrl}/${this.model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature,
          max_new_tokens: maxTokens,
          return_full_text: false
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data[0]?.generated_text || '';
    }
    
    return data.generated_text || '';
  }

  /**
   * Format conversation messages into a prompt
   */
  private formatMessages(messages: ConversationMessage[], systemPrompt?: string): string {
    let prompt = '';
    
    if (systemPrompt) {
      prompt += `<s>[INST] ${systemPrompt} [/INST]\n`;
    }

    for (const msg of messages) {
      if (msg.role === 'user') {
        prompt += `<s>[INST] ${msg.content} [/INST]`;
      } else if (msg.role === 'assistant') {
        prompt += ` ${msg.content}</s>`;
      } else if (msg.role === 'system' && !systemPrompt) {
        prompt += `<s>[INST] ${msg.content} [/INST]\n`;
      }
    }

    return prompt;
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
Use the following context to answer the user's question. 
If the context doesn't contain relevant information, say so.

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
let huggingFaceInstance: HuggingFaceService | null = null;

export function getHuggingFaceService(): HuggingFaceService {
  if (!huggingFaceInstance) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error('HUGGINGFACE_API_KEY environment variable is not set');
    }
    huggingFaceInstance = new HuggingFaceService({ apiKey });
  }
  return huggingFaceInstance;
}
