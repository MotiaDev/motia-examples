/**
 * Google Gemini LLM Service
 * 
 * Handles interactions with Google's Gemini API for UI design and architecture tasks.
 */

import { 
  LLMProvider, 
  LLMMessage, 
  LLMConfig, 
  LLMResponse,
  GEMINI_MODELS,
  MODEL_PRICING 
} from './types';

export class GeminiService implements LLMProvider {
  name = 'gemini';
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  async generate(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    const model = config.model || GEMINI_MODELS.PRO;
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

    // Convert messages to Gemini format
    const contents = this.formatMessages(messages);

    const requestBody = {
      contents,
      generationConfig: {
        maxOutputTokens: config.maxTokens,
        temperature: config.temperature,
        topP: config.topP || 0.95,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const finishReason = this.mapFinishReason(data.candidates?.[0]?.finishReason);
      
      // Estimate tokens (Gemini doesn't always return exact counts)
      const inputTokens = data.usageMetadata?.promptTokenCount || 
        this.estimateTokens(messages.map(m => m.content).join(' '));
      const outputTokens = data.usageMetadata?.candidatesTokenCount || 
        this.estimateTokens(content);

      return {
        content,
        model,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
        finishReason,
        estimatedCost: this.estimateCost(inputTokens, outputTokens),
      };
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[GEMINI_MODELS.PRO];
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  }

  private formatMessages(messages: LLMMessage[]): any[] {
    const contents: any[] = [];
    let systemPrompt = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += msg.content + '\n';
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Prepend system prompt to first user message if exists
    if (systemPrompt && contents.length > 0) {
      const firstUserIdx = contents.findIndex(c => c.role === 'user');
      if (firstUserIdx >= 0) {
        contents[firstUserIdx].parts[0].text = 
          `${systemPrompt}\n\n${contents[firstUserIdx].parts[0].text}`;
      }
    }

    return contents;
  }

  private mapFinishReason(reason: string): LLMResponse['finishReason'] {
    const mapping: Record<string, LLMResponse['finishReason']> = {
      'STOP': 'stop',
      'MAX_TOKENS': 'length',
      'SAFETY': 'content_filter',
      'RECITATION': 'content_filter',
    };
    return mapping[reason] || 'stop';
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

// Singleton instance
let geminiInstance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!geminiInstance) {
    geminiInstance = new GeminiService();
  }
  return geminiInstance;
}

