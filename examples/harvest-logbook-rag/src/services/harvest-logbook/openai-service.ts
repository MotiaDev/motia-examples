/**
 * OpenAI Service
 * Handles embedding generation using OpenAI API
 */

import { EmbeddingChunk } from './types';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
}

export class OpenAIService {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'text-embedding-ada-002';
  }

  /**
   * Generate embeddings for a single text
   */
  async createEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: this.model
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async createEmbeddings(texts: string[]): Promise<EmbeddingChunk[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: texts,
        model: this.model
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    return texts.map((text, index) => ({
      text,
      embedding: data.data[index].embedding
    }));
  }

  /**
   * Process chunks and add embeddings
   */
  async embedChunks(chunks: Array<{ text: string; metadata?: any }>): Promise<EmbeddingChunk[]> {
    const texts = chunks.map(c => c.text);
    const embeddings = await this.createEmbeddings(texts);
    
    return embeddings.map((emb, index) => ({
      ...emb,
      metadata: chunks[index].metadata
    }));
  }
}

// Singleton instance factory
let openAIInstance: OpenAIService | null = null;

export function getOpenAIService(): OpenAIService {
  if (!openAIInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openAIInstance = new OpenAIService({ apiKey });
  }
  return openAIInstance;
}
