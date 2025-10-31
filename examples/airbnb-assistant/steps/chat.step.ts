import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { openaiService } from '../src/services/openai'
import { pineconeService } from '../src/services/pinecone'
import { notionService } from '../src/services/notion'
import { serpService } from '../src/services/serp'

const bodySchema = z.object({
  message: z.string().min(1, 'Message is required'),
  sessionId: z.string().optional(),
  userId: z.string().optional()
})

const SYSTEM_PROMPT = `CURRENT_TIME: {{timestamp}}
CURRENT_DATE: {{formattedDate}}

You are a happy and friendly AI assistant for an Airbnb property located at 3009 Grant St., Concord, CA. You are aware of the current date and time shown above.

DATA SOURCES:
1. ALWAYS check Pinecone database first for answering questions.
2. Use web search only for location/nearby place queries
3. Use conversation history for context but not as a source of truth

TONE:
Maintain a warm, friendly, and conversational tone. Use positive and encouraging language, and show empathy when users are frustrated. Keep explanations simple.

TERM MATCHING:
Before searching the database, match these variations to the same term:
- check in, check-in, checkin → "check-in"
- check out, check-out, checkout → "check-out"
- wifi, wi-fi, wi fi → "WiFi"
- hot tub, hottub, hot-tub → "hot tub"
- tv, t.v., television → "TV"

SPECIAL RESPONSES:
1. For check-in queries: ALWAYS include both time (2 pm) and access code (5555)
2. For check-out queries: ALWAYS include both time (12 pm) and closing instructions
3. For WiFi queries: ALWAYS include the password
4. For amenity queries: ALWAYS include both instructions and link

AMENITY LINKS:
When these items are mentioned, include their link:
- TV Remote: [Click here for TV Remote instructions](https://bit.ly/420GR7T)
- Hot Tub: [Click here for Hot Tub instructions](https://www.youtube.com/watch?v=vzcO-MvpPks)
- Ceiling Fan: [Click here for Ceiling Fan instructions](https://drive.google.com/file/d/1rCvGnm7wJT1dCd60RlEnW6DhcwvWVpOu/view?usp=sharing)
- Thermostat: [Click here for Thermostat instructions](https://www.youtube.com/watch?v=cD4ZVG3C7As)
- Oven: [Click here for Oven instructions](https://drive.google.com/file/d/1bgUF8Dffo5_E7hv_MFl1TQ1q84fpMJz8/view?usp=drive_link)

IF NO INFORMATION FOUND:
"I don't have that information in our property database. Please contact the host, Gustavo Uribe, at 925-555-1234 for assistance."

SAFETY GUARDRAILS:
- Only provide information directly related to the property, local attractions, and guest services
- Defer personal or private questions to the host contact number
- Do not provide information about security systems or cameras
- For emergencies, direct guests to call 911
- For inappropriate requests, politely decline and provide host contact`

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GuestAssistantChat',
  description: 'Main chat endpoint for Airbnb guest assistant',
  path: '/chat',
  method: 'POST',
  bodySchema,
  emits: ['save-conversation'],
  flows: ['guest-assistant'],
  responseSchema: {
    200: z.object({
      response: z.string(),
      sessionId: z.string(),
      sources: z.array(z.object({
        type: z.enum(['vector', 'web']),
        content: z.string(),
        score: z.number().optional()
      })).optional()
    }),
    400: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  }
}

export const handler: Handlers['GuestAssistantChat'] = async (req, { emit, logger }) => {
  try {
    const { message, sessionId: providedSessionId, userId } = bodySchema.parse(req.body)
    
    const sessionId = providedSessionId || Math.random().toString(36).substring(2, 10)
    const timestamp = new Date().toISOString()
    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    logger.info('Processing chat message', { sessionId, message })
    
    // Get conversation history
    const history = await notionService.getConversationHistory(sessionId, 5)
    
    // Search vector database
    const vectorResults = await pineconeService.searchVectors(message, 3)
    let contextInfo = ''
    const sources: any[] = []
    
    if (vectorResults.length > 0) {
      contextInfo += 'From property database:\n'
      vectorResults.forEach(result => {
        contextInfo += `- ${result.text}\n`
        sources.push({
          type: 'vector',
          content: result.text,
          score: result.score
        })
      })
    }
    
    // Check if web search is needed
    const needsWebSearch = /\b(restaurant|food|eat|shop|store|park|attraction|nearby|local|around here)\b/i.test(message)
    
    if (needsWebSearch) {
      const webResults = await serpService.webSearch(
        `${message} near Concord CA`,
        'Concord, CA',
        'local'
      )
      
      if (webResults.length > 0) {
        contextInfo += '\n\nFrom local search:\n'
        webResults.forEach(result => {
          contextInfo += `- ${result.title}: ${result.snippet}\n`
          if (result.rating) {
            contextInfo += `  Rating: ${result.rating}/5 (${result.reviews} reviews)\n`
          }
          sources.push({
            type: 'web',
            content: `${result.title}: ${result.snippet}`,
            score: result.rating
          })
        })
      }
    }
    
    // Prepare messages for AI
    const messages: any[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
          .replace('{{timestamp}}', timestamp)
          .replace('{{formattedDate}}', formattedDate)
      }
    ]
    
    // Add conversation history
    history.forEach(entry => {
      messages.push({
        role: entry.role === 'user' ? 'user' : 'assistant',
        content: entry.content
      })
    })
    
    // Add current context and query
    messages.push({
      role: 'user',
      content: `Context information:\n${contextInfo}\n\nUser question: ${message}`
    })
    
    // Generate response
    const response = await openaiService.chatCompletion(messages)
    
    logger.info('Generated response', { sessionId })
    
    // Emit event to save conversation (async, non-blocking)
    await emit({
      topic: 'save-conversation',
      data: {
        sessionId,
        userId,
        userMessage: message,
        assistantMessage: response,
        timestamp
      }
    })
    
    return {
      status: 200,
      body: {
        response,
        sessionId,
        sources
      }
    }
  } catch (error) {
    logger.error('Chat processing failed', { error: error instanceof Error ? error.message : 'Unknown error' })
    
    return {
      status: 500,
      body: { error: 'Failed to process message' }
    }
  }
}
