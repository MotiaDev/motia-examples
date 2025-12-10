// Calls OpenAI, instructing it to ONLY return JSON like {"sentiment":"positive","analysis":"..."}
import { Handlers } from 'motia'
import { z } from 'zod'
import { OpenAI } from 'openai'
 
// 1) Create an OpenAI client (newer syntax)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
 
export const config = {
  type: 'event',
  name: 'openAiSentimentAnalyzer',
  description: 'Calls OpenAI to analyze sentiment and emits corresponding events.',
  subscribes: ['openai.analyzeSentimentRequest'],
  // We'll emit different events: "openai.positiveSentiment" or "openai.negativeSentiment"
  emits: ['openai.positiveSentiment', 'openai.negativeSentiment'],
  input: z.object({ text: z.string() }),
  flows: ['sentiment-demo'],
} as const
 
// 3) Provide the code that runs on each event
export const handler: Handlers['openAiSentimentAnalyzer'] = async (input, { emit, logger }) => {
  logger.info('[OpenAI Sentiment Analyzer] Prompting OpenAI...', { text: input.text })
 
  try {
    // We'll ask the model to ONLY return JSON with a "sentiment" field
    const systemPrompt =
      'You are an assistant that returns only JSON: {"sentiment":"positive|negative","analysis":"..."}'
    const userPrompt = `Analyze the sentiment of this text: "${input.text}". Return JSON with keys "sentiment" and "analysis".`
 
    // 4) Use the new openai syntax:
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })
 
    // 5) Log and parse the response
    const content = response.choices[0]?.message?.content || ''
    logger.info('[OpenAI Sentiment Analyzer] Raw response', { content })
 
    let parsed: { sentiment?: string; analysis?: string } = {}
    try {
      parsed = JSON.parse(content.trim())
    } catch (err) {
      logger.error('[OpenAI Sentiment Analyzer] Unable to parse JSON', { error: err })
      // If it's not JSON, we bail or handle differently
      return
    }
 
    // 6) Decide how to route the event
    if (parsed.sentiment) {
      if (parsed.sentiment.toLowerCase() === 'positive') {
        await emit({
          topic: 'openai.positiveSentiment',
          data: { ...parsed, sentiment: parsed.sentiment },
        })
      } else {
        // default to negative
        await emit({
          topic: 'openai.negativeSentiment',
          data: { ...parsed, sentiment: parsed.sentiment },
        })
      }
    } else {
      logger.error('[OpenAI Sentiment Analyzer] Sentiment is missing from the parsed response', { parsed })
    }
  } catch (err) {
    if (err instanceof Error) {
      logger.error('[OpenAI Sentiment Analyzer] Error calling OpenAI', { error: err.message })
    } else {
      logger.error('[OpenAI Sentiment Analyzer] An unknown error occurred while calling OpenAI', { error: err })
    }
  }
}