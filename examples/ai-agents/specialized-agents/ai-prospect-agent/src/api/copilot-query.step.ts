/**
 * Copilot Query API Step
 * CopilotKit-compatible endpoint for natural language sales assistant queries
 */
import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ApiMiddleware } from 'motia'
import { ZodError } from 'zod'

const coreMiddleware: ApiMiddleware = async (req, ctx, next) => {
  try {
    return await next()
  } catch (error: any) {
    if (error instanceof ZodError) {
      return { status: 400, body: { error: 'Validation failed' } }
    }
    ctx.logger.error('Request failed', { error: error.message })
    return { status: 500, body: { error: 'Internal Server Error' } }
  }
}

const bodySchema = z.object({
  message: z.string().describe('Natural language query from sales rep'),
  context: z.object({
    userId: z.string().optional(),
    currentPage: z.string().optional(),
    selectedProspects: z.array(z.string()).optional(),
  }).optional(),
})

export const config: ApiRouteConfig = {
  name: 'CopilotQuery',
  type: 'api',
  path: '/api/copilot/query',
  method: 'POST',
  description: 'CopilotKit-compatible endpoint for AI-powered sales assistant',
  emits: [],
  flows: ['prospect-research', 'copilot'],
  middleware: [coreMiddleware],
  bodySchema,
  responseSchema: {
    200: z.object({
      answer: z.string(),
      recommendations: z.array(z.string()),
      prospects: z.array(z.object({
        id: z.string(),
        company_name: z.string(),
        fit_score: z.number(),
        reason: z.string(),
      })).optional(),
      actions: z.array(z.object({
        type: z.string(),
        label: z.string(),
        data: z.any(),
      })).optional(),
    }),
  },
}

// Simple AI query
async function queryAI(prompt: string): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  
  try {
    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      const data = await response.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null
    }
    
    if (anthropicKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await response.json()
      return data.content?.[0]?.text || null
    }
  } catch (e) {
    console.error('AI query error:', e)
  }
  return null
}

export const handler: Handlers['CopilotQuery'] = async (req, { logger, state }) => {
  const { message } = bodySchema.parse(req.body)

  logger.info('Processing copilot query', { message })

  // Gather context data
  const allResults = await state.getGroup<any>('research_results')
  const topProspects = allResults
    .filter(r => r.status === 'completed' && r.fit_score)
    .sort((a, b) => b.fit_score - a.fit_score)
    .slice(0, 20)
    .map(r => ({
      id: r.prospect_id || r.id,
      company_name: r.prospect?.company_name || 'Unknown',
      fit_score: r.fit_score,
      industry: r.prospect?.industry || '',
    }))

  // Try AI response
  const prompt = `You are a sales intelligence copilot. User asks: "${message}"

Top prospects data:
${topProspects.map(p => `- ${p.company_name}: ${p.fit_score} score, ${p.industry}`).join('\n')}

Give concise, actionable advice. If asked about who to call, rank by fit score and explain why.

Respond in JSON:
{
  "answer": "string",
  "recommendations": ["string"],
  "prospectIds": ["optional IDs to focus on"]
}`

  let answer = ''
  let recommendations: string[] = []
  let relevantProspects = topProspects.slice(0, 5).map(p => ({
    id: p.id,
    company_name: p.company_name,
    fit_score: p.fit_score,
    reason: `High fit score of ${p.fit_score}`,
  }))

  const aiResponse = await queryAI(prompt)
  if (aiResponse) {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        answer = parsed.answer || ''
        recommendations = parsed.recommendations || []
      }
    } catch {
      answer = aiResponse
    }
  }

  if (!answer) {
    // Fallback response
    const lowerQuery = message.toLowerCase()
    if (lowerQuery.includes('call') || lowerQuery.includes('priority') || lowerQuery.includes('who should')) {
      if (topProspects.length === 0) {
        answer = 'No prospects have been researched yet. Upload a CSV to get started.'
      } else {
        const top3 = topProspects.slice(0, 3)
        answer = `Based on fit scores, prioritize:\n\n${top3.map((p, i) => `${i + 1}. ${p.company_name} (${p.fit_score} score) - ${p.industry}`).join('\n')}\n\nThese show the strongest buying signals.`
      }
    } else {
      answer = `I found ${topProspects.length} researched prospects. Top: ${topProspects[0]?.company_name || 'N/A'} (${topProspects[0]?.fit_score || 'N/A'} score). How can I help prioritize?`
    }
    recommendations = ['Focus on 80+ fit scores', 'Prioritize recently funded companies', 'Review talking points before calls']
  }

  return {
    status: 200,
    body: {
      answer,
      recommendations,
      prospects: relevantProspects,
      actions: relevantProspects.length > 0 ? [
        { type: 'view_prospect', label: `View ${relevantProspects[0].company_name}`, data: { prospectId: relevantProspects[0].id } },
        { type: 'create_call_list', label: 'Create Call List', data: { prospectIds: relevantProspects.map(p => p.id) } },
      ] : [],
    },
  }
}
