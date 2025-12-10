import OpenAI from 'openai';
import { Ollama } from 'ollama';

export type TextGenerationProvider = 'openai' | 'ollama';

export interface TextGenerationConfig {
  provider: TextGenerationProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class TextGenerationService {
  private config: TextGenerationConfig;
  private openai?: OpenAI;
  private ollama?: Ollama;

  constructor(config: TextGenerationConfig) {
    this.config = config;
    this.initializeClients();
  }

  private initializeClients() {
    if (this.config.provider === 'openai') {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey || process.env.OPENAI_API_KEY,
      });
    } else if (this.config.provider === 'ollama') {
      this.ollama = new Ollama({
        host: this.config.baseUrl || process.env.OLLAMA_HOST || 'http://localhost:11434',
      });
    }
  }

  async generateAnswer(query: string, context: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'Answer the following question using only the provided context. If the context does not contain enough information to answer the question, say so.',
      },
      {
        role: 'user',
        content: `Context: ${context}\n\nQuestion: ${query}`,
      },
    ];

    if (this.config.provider === 'openai') {
      return this.generateWithOpenAI(messages);
    } else if (this.config.provider === 'ollama') {
      return this.generateWithOllama(messages);
    } else {
      throw new Error(`Unsupported text generation provider: ${this.config.provider}`);
    }
  }

  async generateWithMessages(messages: ChatMessage[]): Promise<string> {
    if (this.config.provider === 'openai') {
      return this.generateWithOpenAI(messages);
    } else if (this.config.provider === 'ollama') {
      return this.generateWithOllama(messages);
    } else {
      throw new Error(`Unsupported text generation provider: ${this.config.provider}`);
    }
  }

  private async generateWithOpenAI(messages: ChatMessage[]): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: messages as any,
      max_completion_tokens: this.config.maxTokens || 4096,
    });

    return response.choices[0]?.message?.content || 'No answer generated';
  }

  private async generateWithOllama(messages: ChatMessage[]): Promise<string> {
    if (!this.ollama) {
      throw new Error('Ollama client not initialized');
    }

    try {
      // Convert messages to Ollama format
      const prompt = messages.map(msg => {
        if (msg.role === 'system') {
          return `System: ${msg.content}`;
        } else if (msg.role === 'user') {
          return `Human: ${msg.content}`;
        } else {
          return `Assistant: ${msg.content}`;
        }
      }).join('\n\n') + '\n\nAssistant:';

      const response = await this.ollama.generate({
        model: this.config.model,
        prompt: prompt,
        options: {
          num_predict: this.config.maxTokens || 4096,
          temperature: 0.7,
        },
      });

      return response.response || 'No answer generated';
    } catch (error) {
      console.error('Error generating with Ollama:', error);
      throw error;
    }
  }
}

// Factory function to create text generation service from environment variables
export function createTextGenerationService(): TextGenerationService {
  const provider = (process.env.TEXT_GENERATION_PROVIDER || process.env.EMBEDDING_PROVIDER || 'openai') as TextGenerationProvider;
  
  let model: string;
  let apiKey: string | undefined;
  let baseUrl: string | undefined;
  let maxTokens: number | undefined;

  if (provider === 'openai') {
    model = process.env.OPENAI_TEXT_MODEL || 'gpt-4o';
    apiKey = process.env.OPENAI_API_KEY;
    maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '4096');
  } else if (provider === 'ollama') {
    model = process.env.OLLAMA_TEXT_MODEL || 'llama3.1';
    baseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    maxTokens = parseInt(process.env.OLLAMA_MAX_TOKENS || '4096');
  } else {
    throw new Error(`Unsupported text generation provider: ${provider}`);
  }

  return new TextGenerationService({
    provider,
    model,
    apiKey,
    baseUrl,
    maxTokens,
  });
}
