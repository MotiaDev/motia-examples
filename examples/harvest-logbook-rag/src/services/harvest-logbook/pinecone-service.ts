/**
 * Pinecone Service
 * Handles vector storage and retrieval operations
 */

import { VectorStoreEntry } from './types';

export interface PineconeConfig {
  apiKey: string;
  indexHost?: string;  // Full index host URL (e.g., "your-index-abcd123.svc.us-east-1.pinecone.io")
  environment?: string;
  indexName?: string;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

export class PineconeService {
  private apiKey: string;
  private indexUrl: string;

  constructor(config: PineconeConfig) {
    this.apiKey = config.apiKey;
    
    // Support both new (indexHost) and old (environment + indexName) formats
    if (config.indexHost) {
      // New format: full host URL provided
      this.indexUrl = config.indexHost.startsWith('https://') 
        ? config.indexHost 
        : `https://${config.indexHost}`;
    } else if (config.environment && config.indexName) {
      // Old format: construct from environment and index name
      // Note: This might not work with newer Pinecone setups that require project IDs
      console.warn('Using legacy Pinecone URL format. Consider using PINECONE_INDEX_HOST instead.');
      this.indexUrl = `https://${config.indexName}-${config.environment}.svc.pinecone.io`;
    } else {
      throw new Error('Pinecone configuration requires either indexHost or both environment and indexName');
    }
  }

  /**
   * Insert/upsert vectors into Pinecone
   */
  async upsert(vectors: VectorStoreEntry[]): Promise<void> {
    try {
      const response = await fetch(`${this.indexUrl}/vectors/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.apiKey
        },
        body: JSON.stringify({
          vectors: vectors.map(v => ({
            id: v.id,
            values: v.values,
            metadata: v.metadata
          })),
          namespace: ''
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pinecone upsert error: ${response.status} - ${error}`);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch failed')) {
        throw new Error(
          `Failed to connect to Pinecone at ${this.indexUrl}. ` +
          `Please verify: 1) PINECONE_INDEX_HOST is correct, 2) API key is valid, 3) Network connectivity. ` +
          `Original error: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Query similar vectors from Pinecone
   */
  async query(
    vector: number[],
    topK: number = 5,
    filter?: Record<string, any>
  ): Promise<QueryResult[]> {
    try {
      const response = await fetch(`${this.indexUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.apiKey
        },
        body: JSON.stringify({
          vector,
          topK,
          includeMetadata: true,
          namespace: '',
          ...(filter && { filter })
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pinecone query error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.matches || [];
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch failed')) {
        throw new Error(
          `Failed to connect to Pinecone at ${this.indexUrl}. ` +
          `Please verify: 1) PINECONE_INDEX_HOST is correct, 2) API key is valid, 3) Network connectivity. ` +
          `Get your index host from: Pinecone Console → Your Index → Connect → Host. ` +
          `Original error: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Delete vectors by IDs
   */
  async delete(ids: string[]): Promise<void> {
    const response = await fetch(`${this.indexUrl}/vectors/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': this.apiKey
      },
      body: JSON.stringify({
        ids,
        namespace: ''
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinecone delete error: ${response.status} - ${error}`);
    }
  }

  /**
   * Get index statistics
   */
  async describeIndexStats(): Promise<any> {
    const response = await fetch(`${this.indexUrl}/describe_index_stats`, {
      method: 'GET',
      headers: {
        'Api-Key': this.apiKey
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinecone stats error: ${response.status} - ${error}`);
    }

    return response.json();
  }
}

// Singleton instance factory
let pineconeInstance: PineconeService | null = null;

export function getPineconeService(): PineconeService {
  if (!pineconeInstance) {
    const apiKey = process.env.PINECONE_API_KEY;
    const indexHost = process.env.PINECONE_INDEX_HOST;
    const environment = process.env.PINECONE_ENVIRONMENT;
    const indexName = process.env.PINECONE_INDEX_NAME || 'harvest_logbook';
    
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }
    
    // Prefer PINECONE_INDEX_HOST (new format), fall back to environment + indexName (legacy)
    if (indexHost) {
      pineconeInstance = new PineconeService({ apiKey, indexHost });
    } else {
      console.warn(
        'PINECONE_INDEX_HOST not set. Using legacy URL format with PINECONE_ENVIRONMENT and PINECONE_INDEX_NAME. ' +
        'For newer Pinecone setups, set PINECONE_INDEX_HOST to your full index host URL.'
      );
      pineconeInstance = new PineconeService({ apiKey, environment, indexName });
    }
  }
  return pineconeInstance;
}
