import { ChatCompletionMessage, ChatCompletionResponse } from './types'

export async function generateChatCompletion(
  messages: ChatCompletionMessage[],
  apiKey: string,
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {}
): Promise<string> {
  const {
    model = 'gpt-4',
    temperature = 0.7,
    maxTokens = 1000
  } = options

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI Chat API error: ${response.statusText} - ${errorText}`)
  }
  
  const data = await response.json() as ChatCompletionResponse
  return data.choices[0].message.content
}

