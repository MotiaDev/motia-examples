import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { Tournament } from '../../../src/tournament/tournament'
import { getTournamentSummary } from '../../../src/tournament/tournament'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetTournament',
  description: 'Get tournament status',
  path: '/tournament/:tournamentId',
  method: 'GET',
  emits: [],
  flows: ['tictactoe-tournament'],
  responseSchema: {
    200: z.object({
      id: z.string(),
      name: z.string(),
      status: z.string(),
      progress: z.object({ completedMatches: z.number(), totalMatches: z.number(), percentage: z.number() }),
      standings: z.array(z.object({
        rank: z.number(),
        provider: z.string(),
        teamName: z.string(),
        points: z.number(),
        wins: z.number(),
        draws: z.number(),
        losses: z.number(),
        gamesPlayed: z.number()
      })),
      currentMatch: z.object({ id: z.string(), playerXModel: z.string(), playerOModel: z.string(), status: z.string(), round: z.number() }).optional(),
      matches: z.array(z.object({
        id: z.string(),
        playerXTeam: z.string(),
        playerOTeam: z.string(),
        playerXModel: z.string(),
        playerOModel: z.string(),
        status: z.string(),
        winner: z.string().optional(),
        round: z.number()
      }))
    }),
    404: z.object({ error: z.string() })
  }
}

export const handler: Handlers['GetTournament'] = async (req, { state, logger }) => {
  const { tournamentId } = req.pathParams
  const tournament = await state.get<Tournament>('tournaments', tournamentId)
  
  if (!tournament) return { status: 404, body: { error: `Tournament ${tournamentId} not found` } }

  const summary = getTournamentSummary(tournament)
  const currentMatch = tournament.matches.find(m => m.status === 'in_progress') || tournament.matches.find(m => m.status === 'pending')

  logger.info('Tournament retrieved', { tournamentId, status: tournament.status })

  return {
    status: 200,
    body: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      progress: summary.progress,
      standings: summary.standings,
      currentMatch: currentMatch ? {
        id: currentMatch.id,
        playerXModel: currentMatch.playerXModel,
        playerOModel: currentMatch.playerOModel,
        status: currentMatch.status,
        round: currentMatch.round
      } : undefined,
      matches: tournament.matches.map(m => ({
        id: m.id,
        playerXTeam: m.playerXTeam,
        playerOTeam: m.playerOTeam,
        playerXModel: m.playerXModel,
        playerOModel: m.playerOModel,
        status: m.status,
        winner: m.winner,
        round: m.round
      }))
    }
  }
}
