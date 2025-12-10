import OpenAI from 'openai';
import { Ollama } from 'ollama';

export type EmbeddingProvider = 'openai' | 'ollama';

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  dimension?: number;
}

export class EmbeddingService {
  private config: EmbeddingConfig;
  private openai?: OpenAI;
  private ollama?: Ollama;

  constructor(config: EmbeddingConfig) {
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

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (this.config.provider === 'openai') {
      return this.getOpenAIEmbeddings(texts);
    } else if (this.config.provider === 'ollama') {
      return this.getOllamaEmbeddings(texts);
    } else {
      throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
    }
  }

  async getQueryEmbedding(query: string): Promise<number[]> {
    const embeddings = await this.getEmbeddings([query]);
    return embeddings[0];
  }

  getEmbeddingDimension(): number {
    return this.config.dimension || this.getDefaultDimension();
  }

  private getDefaultDimension(): number {
    if (this.config.provider === 'openai') {
      // OpenAI text-embedding-3-small has 1536 dimensions
      return 1536;
    } else if (this.config.provider === 'ollama') {
      // Check model-specific dimensions
      const model = this.config.model.toLowerCase();
      if (model.includes('mxbai-embed-large')) {
        return 1024; // mxbai-embed-large dimensions
      } else if (model.includes('nomic-embed-text')) {
        return 768; // Smaller, faster model
      } else if (model.includes('all-minilm')) {
        return 384; // Very compact model
      }
      // Default to 1536 for OpenAI compatibility
      return 1536;
    }
    return 1536; // fallback
  }

  private async getOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openai.embeddings.create({
      model: this.config.model,
      input: texts,
    });

    return response.data.map(item => item.embedding);
  }

  private async getOllamaEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.ollama) {
      throw new Error('Ollama client not initialized');
    }

    const embeddings: number[][] = [];
    
    // Ollama doesn't support batch embeddings, so we process one by one
    for (const text of texts) {
      try {
        const response = await this.ollama.embeddings({
          model: this.config.model,
          prompt: text,
        });
        embeddings.push(response.embedding);
      } catch (error) {
        console.error(`Error getting embedding for text: ${text.substring(0, 100)}...`, error);
        throw error;
      }
    }

    return embeddings;
  }
}

// Factory function to create embedding service from environment variables
export function createEmbeddingService(): EmbeddingService {
  const provider = (process.env.EMBEDDING_PROVIDER || 'openai') as EmbeddingProvider;
  
  let model: string;
  let apiKey: string | undefined;
  let baseUrl: string | undefined;

  let dimension: number | undefined;

  if (provider === 'openai') {
    model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    apiKey = process.env.OPENAI_API_KEY;
    dimension = parseInt(process.env.OPENAI_EMBEDDING_DIMENSION || '1536');
  } else if (provider === 'ollama') {
    model = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
    baseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    dimension = parseInt(process.env.OLLAMA_EMBEDDING_DIMENSION || '1024');
  } else {
    throw new Error(`Unsupported embedding provider: ${provider}`);
  }

  return new EmbeddingService({
    provider,
    model,
    apiKey,
    baseUrl,
    dimension,
  });
}
