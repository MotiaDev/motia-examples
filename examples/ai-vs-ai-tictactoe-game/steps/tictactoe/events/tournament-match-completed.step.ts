import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { GameState } from '../../../src/game/logic'
import type { Tournament } from '../../../src/tournament/tournament'
import { updateTournamentAfterGame, getNextPendingMatch, getTournamentSummary } from '../../../src/tournament/tournament'

const inputSchema = z.object({
  tournamentId: z.string(),
  matchId: z.string(),
  gameId: z.string(),
  status: z.enum(['x_wins', 'o_wins', 'draw']),
  winner: z.enum(['X', 'O']).nullable().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'TournamentMatchCompleted',
  description: 'Updates standings and starts next match',
  subscribes: ['tournament.match.completed'],
  emits: ['tournament.match.start', 'tournament.completed'],
  input: inputSchema,
  flows: ['tictactoe-tournament']
}

export const handler: Handlers['TournamentMatchCompleted'] = async (input, { state, emit, logger, streams }) => {
  const { tournamentId, matchId, gameId, status, winner } = input

  logger.info('Match completed', { tournamentId, matchId, status, winner })

  const tournament = await state.get<Tournament>('tournaments', tournamentId)
  const game = await state.get<GameState>('games', gameId)

  if (!tournament) { logger.error('Tournament not found', { tournamentId }); return }
  if (!game) { logger.error('Game not found', { gameId }); return }

  const updatedTournament = updateTournamentAfterGame(tournament, matchId, game)
  await state.set('tournaments', tournamentId, updatedTournament)

  const summary = getTournamentSummary(updatedTournament)

  logger.info('Standings updated', {
    progress: summary.progress,
    standings: summary.standings.map(s => ({ team: s.teamName, points: s.points }))
  })

  if (updatedTournament.status === 'completed') {
    logger.info('🏆 Tournament completed!', { winner: summary.standings[0] })

    await streams.tournamentState.set('tournaments', tournamentId, {
      id: updatedTournament.id,
      name: updatedTournament.name,
      status: 'completed',
      standings: summary.standings,
      progress: summary.progress,
      currentRound: updatedTournament.totalRounds,
      totalRounds: updatedTournament.totalRounds,
      updatedAt: updatedTournament.updatedAt
    })

    await streams.tournamentState.send({ groupId: 'tournaments', id: tournamentId }, {
      type: 'tournament_completed',
      data: { winner: summary.standings[0], finalStandings: summary.standings, timestamp: new Date().toISOString() }
    })

    await emit({ topic: 'tournament.completed', data: { tournamentId, winner: summary.standings[0], standings: summary.standings } })
    return
  }

  const nextMatch = getNextPendingMatch(updatedTournament)

  if (nextMatch) {
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
      currentRound: nextMatch.round,
      totalRounds: updatedTournament.totalRounds,
      updatedAt: updatedTournament.updatedAt
    })

    logger.info('Starting next match', { matchId: nextMatch.id, playerX: nextMatch.playerXModel, playerO: nextMatch.playerOModel })

    await new Promise(resolve => setTimeout(resolve, 1000))

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
  }
}
