import OpenAI from 'openai'

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
}

export async function createEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient()
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  })
  
  return response.data[0].embedding
}
