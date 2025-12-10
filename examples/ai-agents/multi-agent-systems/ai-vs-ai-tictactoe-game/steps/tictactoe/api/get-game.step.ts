import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { GameState } from '../../../src/game/logic'
import { formatBoard, calculateGameStats } from '../../../src/game/logic'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetGame',
  description: 'Get game state',
  path: '/game/:gameId',
  method: 'GET',
  emits: [],
  flows: ['tictactoe-game'],
  responseSchema: {
    200: z.object({
      id: z.string(),
      board: z.array(z.array(z.string().nullable())),
      boardDisplay: z.string(),
      currentPlayer: z.string(),
      status: z.string(),
      playerX: z.object({ modelId: z.string(), provider: z.string() }),
      playerO: z.object({ modelId: z.string(), provider: z.string() }),
      moves: z.array(z.object({
        player: z.string(),
        position: z.object({ row: z.number(), col: z.number() }),
        modelId: z.string(),
        thinkingTime: z.number().optional()
      })),
      stats: z.object({
        totalMoves: z.number(),
        xMoves: z.number(),
        oMoves: z.number(),
        avgThinkingTimeX: z.number(),
        avgThinkingTimeO: z.number(),
        duration: z.number()
      }),
      winner: z.string().nullable().optional(),
      winningLine: z.array(z.object({ row: z.number(), col: z.number() })).nullable().optional()
    }),
    404: z.object({ error: z.string() })
  }
}

export const handler: Handlers['GetGame'] = async (req, { state, logger }) => {
  const { gameId } = req.pathParams
  const game = await state.get<GameState>('games', gameId)
  
  if (!game) return { status: 404, body: { error: `Game ${gameId} not found` } }

  const stats = calculateGameStats(game)
  logger.info('Game retrieved', { gameId, status: game.status })

  return {
    status: 200,
    body: {
      id: game.id,
      board: game.board,
      boardDisplay: formatBoard(game.board),
      currentPlayer: game.currentPlayer,
      status: game.status,
      playerX: game.playerX,
      playerO: game.playerO,
      moves: game.moves.map(m => ({ player: m.player, position: m.position, modelId: m.modelId, thinkingTime: m.thinkingTime })),
      stats,
      winner: game.winner || null,
      winningLine: game.winningLine || null
    }
  }
}
