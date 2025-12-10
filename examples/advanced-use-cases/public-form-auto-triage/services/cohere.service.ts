import { CohereClient } from 'cohere-ai';

let cohere: CohereClient;

function getCohereClient(): CohereClient {
  if (!cohere) {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error('Cohere API key not configured. Please set COHERE_API_KEY in your .env file');
    }
    cohere = new CohereClient({ token: apiKey });
  }
  return cohere;
}

export interface TextChunk {
  text: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingResult {
  embeddings: number[][];
  chunks: TextChunk[];
}

/**
 * Split text into chunks with overlap
 */
export function splitText(text: string, chunkSize: number = 400, overlap: number = 40): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    
    chunks.push({
      text: chunk,
      metadata: {
        start,
        end,
        length: chunk.length
      }
    });

    start = end - overlap;
    
    // Avoid infinite loop if we're at the end
    if (start >= text.length - overlap) {
      break;
    }
  }

  return chunks;
}

/**
 * Generate embeddings for text chunks using Cohere
 */
export async function generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingResult> {
  const client = getCohereClient();
  const texts = chunks.map(c => c.text);
  
  const response = await client.embed({
    texts,
    model: 'embed-english-v3.0',
    inputType: 'search_document'
  });

  return {
    embeddings: response.embeddings,
    chunks
  };
}

/**
 * Process text: split and generate embeddings
 */
export async function processText(text: string): Promise<EmbeddingResult> {
  const chunks = splitText(text);
  return generateEmbeddings(chunks);
}

