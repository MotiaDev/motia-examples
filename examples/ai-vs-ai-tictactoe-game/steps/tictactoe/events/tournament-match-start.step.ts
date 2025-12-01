import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { createGame } from '../../../src/game/logic'
import type { Tournament } from '../../../src/tournament/tournament'
import { getModelById } from '../../../src/models/config'

const inputSchema = z.object({
  tournamentId: z.string(),
  matchId: z.string(),
  playerXTeam: z.enum(['anthropic', 'google', 'openai']),
  playerOTeam: z.enum(['anthropic', 'google', 'openai']),
  playerXModel: z.string(),
  playerOModel: z.string()
})

export const config: EventConfig = {
  type: 'event',
  name: 'TournamentMatchStart',
  description: 'Starts a match within tournament',
  subscribes: ['tournament.match.start'],
  emits: ['game.move.request'],
  input: inputSchema,
  flows: ['tictactoe-tournament']
}

export const handler: Handlers['TournamentMatchStart'] = async (input, { state, emit, logger, streams }) => {
  const { tournamentId, matchId, playerXTeam, playerOTeam, playerXModel, playerOModel } = input

  logger.info('Starting match', { tournamentId, matchId, playerX: playerXModel, playerO: playerOModel })

  const tournament = await state.get<Tournament>('tournaments', tournamentId)
  if (!tournament) { logger.error('Tournament not found', { tournamentId }); return }

  const gameId = `game-${tournamentId}-${matchId}-${Date.now()}`
  const modelX = getModelById(playerXModel)
  const modelO = getModelById(playerOModel)

  const game = createGame(
    gameId,
    { modelId: playerXModel, provider: modelX?.provider || playerXTeam },
    { modelId: playerOModel, provider: modelO?.provider || playerOTeam },
    tournamentId,
    matchId
  )

  await state.set('games', gameId, game)

  const updatedMatches = tournament.matches.map(m => 
    m.id === matchId ? { ...m, gameId, status: 'in_progress' as const } : m
  )

  await state.set('tournaments', tournamentId, { ...tournament, matches: updatedMatches, updatedAt: new Date().toISOString() })

  await streams.gameState.set('games', gameId, {
    id: game.id,
    board: game.board,
    currentPlayer: game.currentPlayer,
    status: game.status,
    playerX: game.playerX,
    playerO: game.playerO,
    moveCount: game.moves.length,
    tournamentId,
    matchId,
    updatedAt: game.updatedAt
  })

  await streams.tournamentState.send({ groupId: 'tournaments', id: tournamentId }, {
    type: 'match_started',
    data: { matchId, gameId, playerXModel, playerOModel, timestamp: new Date().toISOString() }
  })

  logger.info('Match started', { gameId, matchId })

  await emit({
    topic: 'game.move.request',
    data: { gameId, player: 'X', modelId: playerXModel, provider: modelX?.provider || playerXTeam, tournamentId, matchId }
  })
}
