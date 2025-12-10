import { Pinecone } from '@pinecone-database/pinecone'
import { openaiService } from '../openai'

function getPineconeClient() {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!
  })
}

export async function insertVectors(
  texts: string[],
  metadata: Record<string, any>[] = []
): Promise<void> {
  const pinecone = getPineconeClient()
  const indexName = process.env.PINECONE_INDEX_NAME || 'airbnb-assistant'
  const index = pinecone.index(indexName)
  
  // Create embeddings for all texts
  const embeddings = await Promise.all(
    texts.map(text => openaiService.createEmbedding(text))
  )
  
  // Prepare vectors for insertion
  const vectors = texts.map((text, i) => ({
    id: `vec_${Date.now()}_${i}`,
    values: embeddings[i],
    metadata: {
      text,
      ...metadata[i]
    }
  }))
  
  // Insert vectors
  await index.upsert(vectors)
}
