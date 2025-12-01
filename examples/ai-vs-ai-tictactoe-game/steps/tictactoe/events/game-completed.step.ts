import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { GameState } from '../../../src/game/logic'
import { formatBoard, calculateGameStats } from '../../../src/game/logic'

const inputSchema = z.object({
  gameId: z.string(),
  status: z.enum(['x_wins', 'o_wins', 'draw']),
  winner: z.enum(['X', 'O']).nullable().optional(),
  winningLine: z.array(z.object({ row: z.number(), col: z.number() })).nullable().optional(),
  totalMoves: z.number(),
  tournamentId: z.string().optional(),
  matchId: z.string().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'GameCompleted',
  description: 'Handles game completion',
  subscribes: ['game.completed'],
  emits: [],
  input: inputSchema,
  flows: ['tictactoe-game']
}

export const handler: Handlers['GameCompleted'] = async (input, { state, logger, streams }) => {
  const { gameId, status, winner, totalMoves, tournamentId, matchId } = input

  const game = await state.get<GameState>('games', gameId)
  if (!game) { logger.warn('Game not found', { gameId }); return }

  const stats = calculateGameStats(game)

  logger.info('🎮 Game Completed!', {
    gameId, status, winner, totalMoves,
    playerX: game.playerX.modelId,
    playerO: game.playerO.modelId,
    duration: stats.duration
  })

  logger.info('Final Board', { board: formatBoard(game.board) })

  await streams.gameState.send({ groupId: 'games', id: gameId }, {
    type: 'game_completed',
    data: {
      status, winner,
      stats: { totalMoves, duration: stats.duration, avgThinkingTimeX: Math.round(stats.avgThinkingTimeX), avgThinkingTimeO: Math.round(stats.avgThinkingTimeO) },
      timestamp: new Date().toISOString()
    }
  })

  await state.set('completed-games', gameId, {
    gameId, status, winner,
    playerX: game.playerX,
    playerO: game.playerO,
    totalMoves, stats, tournamentId, matchId,
    completedAt: new Date().toISOString()
  })

  if (winner) {
    const winnerModel = winner === 'X' ? game.playerX : game.playerO
    logger.info(`🏆 Winner: ${winnerModel.modelId}`)
  } else {
    logger.info('🤝 Draw!')
  }
}
