import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { GameState } from '../../../src/game/logic'
import { makeMove, getValidMoves } from '../../../src/game/logic'
import { requestAIMove, formatMoveForHistory } from '../../../src/game/ai-service'
import type { ModelProvider } from '../../../src/models/config'

const inputSchema = z.object({
  gameId: z.string(),
  player: z.enum(['X', 'O']),
  modelId: z.string(),
  provider: z.enum(['anthropic', 'google', 'openai']),
  tournamentId: z.string().optional(),
  matchId: z.string().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessAIMove',
  description: 'Requests a move from an AI model and processes it',
  subscribes: ['game.move.request'],
  emits: ['game.move.request', 'game.completed', 'tournament.match.completed'],
  input: inputSchema,
  flows: ['tictactoe-game']
}

export const handler: Handlers['ProcessAIMove'] = async (input, { state, emit, logger, streams }) => {
  const { gameId, player, modelId, provider, tournamentId, matchId } = input

  logger.info('Processing AI move', { gameId, player, modelId })

  const game = await state.get<GameState>('games', gameId)
  if (!game) { logger.error('Game not found', { gameId }); return }

  if (game.status !== 'in_progress') { logger.info('Game completed', { gameId, status: game.status }); return }

  if (game.currentPlayer !== player) {
    logger.warn('Wrong turn', { currentPlayer: game.currentPlayer, requestedPlayer: player })
    return
  }

  const moveHistory = game.moves.map((m, i) => formatMoveForHistory(i + 1, m.player, m.position, m.modelId))

  logger.info('Requesting AI move', { modelId, validMoves: getValidMoves(game.board).length })
  
  const aiResponse = await requestAIMove(game.board, player, modelId, provider as ModelProvider, moveHistory)

  if (!aiResponse.success) {
    logger.warn('AI fallback used', { gameId, modelId, error: aiResponse.error })
  }

  logger.info('AI move received', { gameId, player, move: aiResponse.move, thinkingTime: aiResponse.thinkingTime })

  let updatedGame: GameState
  try {
    updatedGame = makeMove(game, aiResponse.move, modelId, aiResponse.thinkingTime)
  } catch (error) {
    logger.error('Failed to apply move', { gameId, move: aiResponse.move, error: String(error) })
    return
  }

  await state.set('games', gameId, updatedGame)

  const lastMove = updatedGame.moves[updatedGame.moves.length - 1]
  await streams.gameState.set('games', gameId, {
    id: updatedGame.id,
    board: updatedGame.board,
    currentPlayer: updatedGame.currentPlayer,
    status: updatedGame.status,
    playerX: updatedGame.playerX,
    playerO: updatedGame.playerO,
    lastMove: { player: lastMove.player, row: lastMove.position.row, col: lastMove.position.col, modelId: lastMove.modelId, thinkingTime: lastMove.thinkingTime },
    moveCount: updatedGame.moves.length,
    winner: updatedGame.winner || undefined,
    winningLine: updatedGame.winningLine || undefined,
    tournamentId,
    matchId,
    updatedAt: updatedGame.updatedAt
  })

  await streams.gameState.send({ groupId: 'games', id: gameId }, {
    type: 'move_made',
    data: { player, position: aiResponse.move, modelId, thinkingTime: aiResponse.thinkingTime, timestamp: new Date().toISOString() }
  })

  if (updatedGame.status !== 'in_progress') {
    logger.info('Game ended', { gameId, status: updatedGame.status, winner: updatedGame.winner })

    await emit({
      topic: 'game.completed',
      data: { gameId, status: updatedGame.status, winner: updatedGame.winner, winningLine: updatedGame.winningLine, totalMoves: updatedGame.moves.length, tournamentId, matchId }
    })

    if (tournamentId && matchId) {
      await emit({
        topic: 'tournament.match.completed',
        data: { tournamentId, matchId, gameId, status: updatedGame.status, winner: updatedGame.winner }
      })
    }
    return
  }

  const nextPlayer = updatedGame.currentPlayer
  const nextModelId = nextPlayer === 'X' ? updatedGame.playerX.modelId : updatedGame.playerO.modelId
  const nextProvider = nextPlayer === 'X' ? updatedGame.playerX.provider : updatedGame.playerO.provider

  await new Promise(resolve => setTimeout(resolve, 500))

  await emit({
    topic: 'game.move.request',
    data: { gameId, player: nextPlayer, modelId: nextModelId, provider: nextProvider, tournamentId, matchId }
  })
}
