import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { createGame, formatBoard } from '../../../src/game/logic'
import { getModelById, ALL_MODELS } from '../../../src/models/config'

const bodySchema = z.object({
  playerXModel: z.string().min(1, 'Player X model is required'),
  playerOModel: z.string().min(1, 'Player O model is required'),
  autoPlay: z.boolean().default(true).optional()
})

const responseSchema = z.object({
  id: z.string(),
  board: z.array(z.array(z.string().nullable())),
  boardDisplay: z.string(),
  currentPlayer: z.string(),
  status: z.string(),
  playerX: z.object({ modelId: z.string(), provider: z.string(), displayName: z.string() }),
  playerO: z.object({ modelId: z.string(), provider: z.string(), displayName: z.string() }),
  message: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CreateGame',
  description: 'Create a single Tic Tac Toe game between two AI models',
  path: '/game',
  method: 'POST',
  emits: ['game.move.request'],
  flows: ['tictactoe-game'],
  bodySchema,
  responseSchema: { 201: responseSchema, 400: z.object({ error: z.string() }) }
}

export const handler: Handlers['CreateGame'] = async (req, { state, emit, logger, streams }) => {
  try {
    const body = bodySchema.parse(req.body)
    const { playerXModel, playerOModel, autoPlay } = body

    const modelX = getModelById(playerXModel)
    const modelO = getModelById(playerOModel)

    if (!modelX) {
      return { status: 400, body: { error: `Invalid Player X model: ${playerXModel}. Valid: ${ALL_MODELS.map(m => m.id).join(', ')}` } }
    }

    if (!modelO) {
      return { status: 400, body: { error: `Invalid Player O model: ${playerOModel}. Valid: ${ALL_MODELS.map(m => m.id).join(', ')}` } }
    }

    const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const game = createGame(gameId, { modelId: playerXModel, provider: modelX.provider }, { modelId: playerOModel, provider: modelO.provider })

    await state.set('games', gameId, game)

    await streams.gameState.set('games', gameId, {
      id: game.id,
      board: game.board,
      currentPlayer: game.currentPlayer,
      status: game.status,
      playerX: game.playerX,
      playerO: game.playerO,
      moveCount: game.moves.length,
      updatedAt: game.updatedAt
    })

    logger.info('Game created', { gameId, playerX: playerXModel, playerO: playerOModel })

    if (autoPlay !== false) {
      await emit({
        topic: 'game.move.request',
        data: { gameId, player: 'X', modelId: playerXModel, provider: modelX.provider }
      })
    }

    return {
      status: 201,
      body: {
        id: game.id,
        board: game.board,
        boardDisplay: formatBoard(game.board),
        currentPlayer: game.currentPlayer,
        status: game.status,
        playerX: { modelId: playerXModel, provider: modelX.provider, displayName: modelX.displayName },
        playerO: { modelId: playerOModel, provider: modelO.provider, displayName: modelO.displayName },
        message: autoPlay !== false ? 'Game created! First move is being requested...' : 'Game created! Use the move endpoint to play.'
      }
    }
  } catch (error) {
    logger.error('Failed to create game', { error: String(error) })
    return { status: 400, body: { error: error instanceof Error ? error.message : 'Failed to create game' } }
  }
}
