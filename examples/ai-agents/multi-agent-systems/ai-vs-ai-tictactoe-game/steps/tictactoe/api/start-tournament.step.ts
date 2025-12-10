import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { Tournament } from '../../../src/tournament/tournament'
import { getNextPendingMatch, getTournamentSummary } from '../../../src/tournament/tournament'

const bodySchema = z.object({ tournamentId: z.string().min(1) })

const responseSchema = z.object({
  tournamentId: z.string(),
  status: z.string(),
  currentMatch: z.object({
    id: z.string(),
    playerXTeam: z.string(),
    playerOTeam: z.string(),
    playerXModel: z.string(),
    playerOModel: z.string()
  }).optional(),
  message: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'StartTournament',
  description: 'Start a tournament',
  path: '/tournament/start',
  method: 'POST',
  emits: ['tournament.match.start'],
  flows: ['tictactoe-tournament'],
  bodySchema,
  responseSchema: { 200: responseSchema, 400: z.object({ error: z.string() }), 404: z.object({ error: z.string() }) }
}

export const handler: Handlers['StartTournament'] = async (req, { state, emit, logger, streams }) => {
  try {
    const { tournamentId } = bodySchema.parse(req.body)

    const tournament = await state.get<Tournament>('tournaments', tournamentId)
    if (!tournament) return { status: 404, body: { error: `Tournament ${tournamentId} not found` } }
    if (tournament.status === 'completed') return { status: 400, body: { error: 'Tournament completed' } }
    if (tournament.status === 'cancelled') return { status: 400, body: { error: 'Tournament cancelled' } }

    const updatedTournament: Tournament = { ...tournament, status: 'in_progress', updatedAt: new Date().toISOString() }
    await state.set('tournaments', tournamentId, updatedTournament)

    const nextMatch = getNextPendingMatch(updatedTournament)
    if (!nextMatch) return { status: 400, body: { error: 'No pending matches' } }

    const summary = getTournamentSummary(updatedTournament)
    await streams.tournamentState.set('tournaments', tournamentId, {
      id: updatedTournament.id,
      name: updatedTournament.name,
      status: updatedTournament.status,
      standings: summary.standings,
      currentMatch: {
        id: nextMatch.id,
        playerXTeam: nextMatch.playerXTeam,
        playerOTeam: nextMatch.playerOTeam,
        playerXModel: nextMatch.playerXModel,
        playerOModel: nextMatch.playerOModel,
        status: nextMatch.status,
        round: nextMatch.round
      },
      progress: summary.progress,
      currentRound: updatedTournament.currentRound,
      totalRounds: updatedTournament.totalRounds,
      updatedAt: updatedTournament.updatedAt
    })

    await emit({
      topic: 'tournament.match.start',
      data: {
        tournamentId,
        matchId: nextMatch.id,
        playerXTeam: nextMatch.playerXTeam,
        playerOTeam: nextMatch.playerOTeam,
        playerXModel: nextMatch.playerXModel,
        playerOModel: nextMatch.playerOModel
      }
    })

    logger.info('Tournament started', { tournamentId, firstMatchId: nextMatch.id })

    return {
      status: 200,
      body: {
        tournamentId,
        status: 'in_progress',
        currentMatch: {
          id: nextMatch.id,
          playerXTeam: nextMatch.playerXTeam,
          playerOTeam: nextMatch.playerOTeam,
          playerXModel: nextMatch.playerXModel,
          playerOModel: nextMatch.playerOModel
        },
        message: 'Tournament started!'
      }
    }
  } catch (error) {
    logger.error('Failed to start tournament', { error: String(error) })
    return { status: 400, body: { error: error instanceof Error ? error.message : 'Failed to start tournament' } }
  }
}
