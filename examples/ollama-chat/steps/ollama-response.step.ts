import { EventConfig, Handlers } from 'motia'
import { Ollama } from 'ollama'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'AiResponse',
  description: 'Generate streaming AI response',
  subscribes: ['chat-message'],
  emits: [],
  input: z.object({
    message: z.string(),
    conversationId: z.string(),
    assistantMessageId: z.string(),
  }),
  flows: ['chat'],
}

export const handler: Handlers['AiResponse'] = async (input, context) => {
  const { logger, streams } = context
  const { message, conversationId, assistantMessageId } = input

  logger.info('Generating AI response', { conversationId })

  const ollama = new Ollama({
    host: process.env.OLLAMA_HOST || 'http://localhost:11434'
  })

  try {
    await streams.conversation.set(conversationId, assistantMessageId, {
      message: '',
      from: 'assistant',
      status: 'streaming',
      timestamp: new Date().toISOString(),
    })

    const stream = await ollama.chat({
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Keep responses concise and friendly.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      stream: true,
    })

    let fullResponse = ''

    for await (const chunk of stream) {
      const content = chunk.message?.content || ''
      if (content) {
        fullResponse += content
        
        await streams.conversation.set(conversationId, assistantMessageId, {
          message: fullResponse,
          from: 'assistant',
          status: 'streaming',
          timestamp: new Date().toISOString(),
        })
      }
    }

    await streams.conversation.set(conversationId, assistantMessageId, {
      message: fullResponse,
      from: 'assistant',
      status: 'completed',
      timestamp: new Date().toISOString(),
    })

    logger.info('AI response completed', { 
      conversationId,
      responseLength: fullResponse.length 
    })

  } catch (error) {
    logger.error('Error generating AI response', { error, conversationId })
    
    await streams.conversation.set(conversationId, assistantMessageId, {
      message: 'Sorry, I encountered an error. Please try again.',
      from: 'assistant',
      status: 'completed',
      timestamp: new Date().toISOString(),
    })
  }
}
