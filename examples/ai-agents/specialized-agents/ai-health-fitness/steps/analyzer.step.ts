import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import OpenAI from 'openai'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import Mustache from 'mustache'
import fs from 'fs/promises';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const schema = z.object({
  user: z.string()
})

export const config: EventConfig = {
  type: 'event',
  name: 'habit-analyzer',
  description: 'Analyze user health activity from SQLite and summarize',
  subscribes: ['analyze-user-habits'],
  emits: ['send-whatsapp-message-request'],
  input: schema,
  flows: ['health-companion']
}

export const handler: Handlers['habit-analyzer'] = async (input, { logger, emit }) => {
  const { user } = input
  logger.info(`Analyzing tracker logs for user: ${user}`)

  const db = await open({ filename: 'health_data.db', driver: sqlite3.Database })
  const logs = await db.all('SELECT * FROM tracker WHERE user = ? ORDER BY timestamp DESC LIMIT 10', [user])

  if (!logs.length) {
    const msg = 'No activity logs found to analyze.'
    logger.info(msg)
    
    await emit({
      topic: 'send-whatsapp-message-request',
      data: {
        user,
        message: msg
      }
    })
    return
  }

  const template = await fs.readFile('prompts/analyze-health.mustache', 'utf-8');
  const prompt = Mustache.render(template, { logs });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
    { role: 'system', content: 'You are a health coach helping users reflect on their habits.' },
    { role: 'user', content: prompt }
  ]
  });

  const summary = response.choices[0].message.content
  logger.info('Insight received from AI', { user, summary })
  await emit({
    topic: 'send-whatsapp-message-request',
    data: {
      user,
      message: summary
    }
  })
}
