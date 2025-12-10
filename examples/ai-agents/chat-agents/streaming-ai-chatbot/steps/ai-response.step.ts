import { EventConfig, Handlers } from 'motia'
import { OpenAI } from 'openai'
import { z } from 'zod'
// import { AzureOpenAI } from 'openai'

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

  // For Azure OpenAI
  // const openai = new AzureOpenAI({
  //   endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'demo-key',
  //   apiKey: process.env.AZURE_OPENAI_API_KEY || 'demo-key',
  //   deployment: 'gpt-4o-mini',
  //   apiVersion: '2024-12-01-preview'
  // })

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  })

  try {
    await streams.conversation.set(conversationId, assistantMessageId, {
      message: '',
      from: 'assistant',
      status: 'streaming',
      timestamp: new Date().toISOString(),
    })

    // Available models in order of preference (fallback strategy)
    const availableModels = [
      'gpt-4o-mini',           // Most reliable and accessible
      'gpt-3.5-turbo',         // Fallback option
      'gpt-4o',                // If available
    ]

    // Try models in order until one works
    let stream = null
    let usedModel = null
    
    for (const model of availableModels) {
      try {
        logger.info('Attempting to use model', { model, conversationId })
        
        stream = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant. Format your responses using markdown when appropriate - use **bold** for emphasis, `code` for inline code, ```language for code blocks, - for bullet points, ## for headers, etc. Keep responses well-structured and easy to read.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          stream: true,
          max_tokens: 1000,
          temperature: 0.7,
        })
        
        usedModel = model
        logger.info('Successfully using model', { model, conversationId })
        break
        
      } catch (modelError) {
        const errorMessage = modelError instanceof Error ? modelError.message : String(modelError)
        logger.warn('Model failed, trying next', { 
          model, 
          error: errorMessage,
          conversationId 
        })
        continue
      }
    }

    if (!stream) {
      throw new Error('All AI models failed - please check your OpenAI API key and organization settings')
    }

    let fullResponse = ''

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
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
      responseLength: fullResponse.length,
      modelUsed: usedModel
    })

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error('Error generating AI response', { error: errorMsg, conversationId })
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Sorry, I encountered an error. Please try again.'
    
    if (errorMsg.includes('API key')) {
      errorMessage = 'API key issue detected. Please check your OpenAI configuration.'
    } else if (errorMsg.includes('organization')) {
      errorMessage = 'Organization verification required. Please check your OpenAI account settings.'
    } else if (errorMsg.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.'
    } else if (errorMsg.includes('All AI models failed')) {
      errorMessage = 'All AI models are currently unavailable. Please check your OpenAI API key.'
    }
    
    await streams.conversation.set(conversationId, assistantMessageId, {
      message: errorMessage,
      from: 'assistant',
      status: 'completed',
      timestamp: new Date().toISOString(),
    })
  }
}
