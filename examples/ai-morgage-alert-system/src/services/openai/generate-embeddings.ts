import { EmbeddingResponse } from './types'

export async function generateEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: texts
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI Embeddings API error: ${response.statusText} - ${errorText}`)
  }
  
  const data = await response.json() as EmbeddingResponse
  return data.data.map(item => item.embedding)
}

