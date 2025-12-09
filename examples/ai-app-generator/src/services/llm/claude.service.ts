/**
 * Anthropic Claude LLM Service
 * 
 * Handles interactions with Claude API for code generation tasks.
 * Uses Claude Opus 4.5 for high-quality code generation without truncation.
 */

import { 
  LLMProvider, 
  LLMMessage, 
  LLMConfig, 
  LLMResponse,
  CLAUDE_MODELS,
  MODEL_PRICING 
} from './types';

export class ClaudeService implements LLMProvider {
  name = 'claude';
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  async generate(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    const model = config.model || CLAUDE_MODELS.SONNET;
    const url = `${this.baseUrl}/messages`;

    // Separate system message from other messages
    const { systemPrompt, conversationMessages } = this.formatMessages(messages);

    const requestBody: any = {
      model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages: conversationMessages,
    };

    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      const content = data.content?.[0]?.text || '';
      const finishReason = this.mapStopReason(data.stop_reason);
      
      const inputTokens = data.usage?.input_tokens || 0;
      const outputTokens = data.usage?.output_tokens || 0;

      return {
        content,
        model,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
        finishReason,
        estimatedCost: this.estimateCost(inputTokens, outputTokens, model),
      };
    } catch (error: any) {
      console.error('Claude API Error:', error);
      throw new Error(`Claude generation failed: ${error.message}`);
    }
  }

  estimateCost(inputTokens: number, outputTokens: number, model?: string): number {
    const modelKey = model || CLAUDE_MODELS.SONNET;
    const pricing = MODEL_PRICING[modelKey as keyof typeof MODEL_PRICING] || MODEL_PRICING[CLAUDE_MODELS.SONNET];
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  }

  private formatMessages(messages: LLMMessage[]): { 
    systemPrompt: string; 
    conversationMessages: { role: string; content: string }[] 
  } {
    let systemPrompt = '';
    const conversationMessages: { role: string; content: string }[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
      } else {
        conversationMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return { systemPrompt, conversationMessages };
  }

  private mapStopReason(reason: string): LLMResponse['finishReason'] {
    const mapping: Record<string, LLMResponse['finishReason']> = {
      'end_turn': 'stop',
      'max_tokens': 'length',
      'stop_sequence': 'stop',
    };
    return mapping[reason] || 'stop';
  }
}

// Singleton instance
let claudeInstance: ClaudeService | null = null;

export function getClaudeService(): ClaudeService {
  if (!claudeInstance) {
    claudeInstance = new ClaudeService();
  }
  return claudeInstance;
}

