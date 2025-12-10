import OpenAI from 'openai'

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chatCompletion(
  messages: ChatMessage[],
  model: string = 'gpt-4-turbo-preview'
): Promise<string> {
  const openai = getOpenAIClient()
  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 1000
  })
  
  return response.choices[0].message.content || ''
}
