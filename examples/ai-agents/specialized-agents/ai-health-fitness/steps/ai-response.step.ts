import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const schema = z.object({
  message: z.string(),
  conversationId: z.string().optional(),
  assistantMessageId: z.string()
})

export const config: EventConfig = {
  type: 'event',
  name: 'ai-health-response',
  description: 'Generate OpenAI reply and send to WhatsApp via event',
  subscribes: ['health-chat-message'],
  emits: ['send-whatsapp-message-request'],
  input: schema,
  flows: ['health-companion']
}

export const handler: Handlers['ai-health-response'] =  async (input, { logger, emit }) => {
  const { message } = input
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a friendly AI health & fitness coach.' },
      { role: 'user', content: message }
    ],
    stream: true
  })

  let fullResponse = ''
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || ''
    fullResponse += token
  }

  await emit({
    topic: 'send-whatsapp-message-request',
    data: {
      user: process.env.RECEIVER_PHONE,
      message: fullResponse
    }
  })

  logger.info('Emitted send-whatsapp-message-request')
}
