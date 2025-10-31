import { Pinecone } from '@pinecone-database/pinecone'
import { openaiService } from '../openai'

export interface SearchResult {
  text: string
  score: number
  metadata: any
}

function getPineconeClient() {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!
  })
}

export async function searchVectors(
  query: string,
  topK: number = 5
): Promise<SearchResult[]> {
  const pinecone = getPineconeClient()
  const indexName = process.env.PINECONE_INDEX_NAME || 'airbnb-assistant'
  const index = pinecone.index(indexName)
  
  // Create embedding for query
  const queryEmbedding = await openaiService.createEmbedding(query)
  
  // Search for similar vectors
  const results = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true
  })
  
  return results.matches?.map(match => ({
    text: match.metadata?.text as string || '',
    score: match.score || 0,
    metadata: match.metadata || {}
  })) || []
}
