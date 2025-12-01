import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { createTournament, getTournamentSummary } from '../../../src/tournament/tournament'
import { DEFAULT_TEAMS, CLAUDE_MODELS, GEMINI_MODELS, OPENAI_MODELS } from '../../../src/models/config'

const teamConfigSchema = z.object({ models: z.array(z.string()).length(3) })

const bodySchema = z.object({
  name: z.string().min(1).default('AI Tic Tac Toe Championship'),
  teams: z.object({
    anthropic: teamConfigSchema.optional(),
    google: teamConfigSchema.optional(),
    openai: teamConfigSchema.optional()
  }).optional()
})

const responseSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  teams: z.object({
    anthropic: z.object({ name: z.string(), models: z.array(z.string()) }),
    google: z.object({ name: z.string(), models: z.array(z.string()) }),
    openai: z.object({ name: z.string(), models: z.array(z.string()) })
  }),
  totalMatches: z.number(),
  message: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CreateTournament',
  description: 'Create a new AI Tic Tac Toe tournament',
  path: '/tournament',
  method: 'POST',
  emits: [],
  flows: ['tictactoe-tournament'],
  bodySchema,
  responseSchema: { 201: responseSchema, 400: z.object({ error: z.string() }) }
}

export const handler: Handlers['CreateTournament'] = async (req, { state, logger, streams }) => {
  try {
    const body = bodySchema.parse(req.body)
    const tournamentId = `tournament-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const teams = {
      anthropic: { name: 'Team Claude', models: body.teams?.anthropic?.models || DEFAULT_TEAMS.anthropic.models },
      google: { name: 'Team Gemini', models: body.teams?.google?.models || DEFAULT_TEAMS.google.models },
      openai: { name: 'Team OpenAI', models: body.teams?.openai?.models || DEFAULT_TEAMS.openai.models }
    }

    const validateModels = (models: string[], validModels: { id: string }[], teamName: string) => {
      const validIds = validModels.map(m => m.id)
      for (const modelId of models) {
        if (!validIds.includes(modelId)) throw new Error(`Invalid model "${modelId}" for ${teamName}`)
      }
    }

    validateModels(teams.anthropic.models, CLAUDE_MODELS, 'Team Claude')
    validateModels(teams.google.models, GEMINI_MODELS, 'Team Gemini')
    validateModels(teams.openai.models, OPENAI_MODELS, 'Team OpenAI')

    const tournament = createTournament(tournamentId, body.name, teams)
    await state.set('tournaments', tournamentId, tournament)

    const summary = getTournamentSummary(tournament)
    await streams.tournamentState.set('tournaments', tournamentId, {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      standings: summary.standings,
      progress: summary.progress,
      currentRound: tournament.currentRound,
      totalRounds: tournament.totalRounds,
      updatedAt: tournament.updatedAt
    })

    logger.info('Tournament created', { tournamentId, name: body.name, totalMatches: tournament.matches.length })

    return {
      status: 201,
      body: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        teams: tournament.teams,
        totalMatches: tournament.matches.length,
        message: `Tournament created with ${tournament.matches.length} matches!`
      }
    }
  } catch (error) {
    logger.error('Failed to create tournament', { error: String(error) })
    return { status: 400, body: { error: error instanceof Error ? error.message : 'Failed to create tournament' } }
  }
}
