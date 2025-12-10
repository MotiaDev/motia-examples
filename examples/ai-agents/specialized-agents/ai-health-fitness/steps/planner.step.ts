import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const schema = z.object({
  user: z.string(),
  type: z.enum(['meal', 'workout']),
  prompt: z.string()
})

export const config: EventConfig = {
  type: 'event',
  name: 'planner',
  description: 'Generate tailored meal or workout plans',
  subscribes: ['planner-request'],
  emits: ['send-whatsapp-message-request'],
  input: schema,
  flows: ['health-companion']
}

export const handler: Handlers['planner'] = async (input, { logger, emit }) => {
  const { user, prompt, type } = input

  logger.info(`Planner prompt from ${user}: ${prompt}`)

  const chat = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a fitness and diet planning assistant.' },
      { role: 'user', content: prompt }
    ]
  })

  const response = chat.choices[0].message.content
  logger.info(`AI ${type} plan for ${user}: ${response}`)
  await emit({
    topic: 'send-whatsapp-message-request', 
    data: {
      user,
      message: response
    }
  })
}