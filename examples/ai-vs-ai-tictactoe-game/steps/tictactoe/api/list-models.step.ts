import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { CLAUDE_MODELS, GEMINI_MODELS, OPENAI_MODELS, DEFAULT_TEAMS } from '../../../src/models/config'

const modelSchema = z.object({
  id: z.string(),
  provider: z.string(),
  category: z.string(),
  reasoningMode: z.string(),
  latencyProfile: z.string(),
  displayName: z.string(),
  description: z.string().optional()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ListModels',
  description: 'List available AI models',
  path: '/models',
  method: 'GET',
  emits: [],
  flows: ['tictactoe-tournament'],
  queryParams: [{ name: 'provider', description: 'Filter by provider' }],
  responseSchema: {
    200: z.object({
      anthropic: z.object({ teamName: z.string(), defaultModels: z.array(z.string()), models: z.array(modelSchema) }),
      google: z.object({ teamName: z.string(), defaultModels: z.array(z.string()), models: z.array(modelSchema) }),
      openai: z.object({ teamName: z.string(), defaultModels: z.array(z.string()), models: z.array(modelSchema) })
    })
  }
}

export const handler: Handlers['ListModels'] = async (req, { logger }) => {
  const { provider } = req.queryParams as { provider?: string }
  logger.info('Listing models', { provider: provider || 'all' })

  const response = {
    anthropic: { teamName: DEFAULT_TEAMS.anthropic.displayName, defaultModels: DEFAULT_TEAMS.anthropic.models, models: CLAUDE_MODELS },
    google: { teamName: DEFAULT_TEAMS.google.displayName, defaultModels: DEFAULT_TEAMS.google.models, models: GEMINI_MODELS },
    openai: { teamName: DEFAULT_TEAMS.openai.displayName, defaultModels: DEFAULT_TEAMS.openai.models, models: OPENAI_MODELS }
  }

  if (provider && ['anthropic', 'google', 'openai'].includes(provider)) {
    const filtered: any = {}
    filtered[provider] = response[provider as keyof typeof response]
    return { status: 200, body: filtered }
  }

  return { status: 200, body: response }
}
