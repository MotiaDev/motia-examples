import { StreamConfig } from 'motia'
import { z } from 'zod'

export const gameStreamSchema = z.object({
  id: z.string(),
  board: z.array(z.array(z.string().nullable())),
  currentPlayer: z.enum(['X', 'O']),
  status: z.enum(['waiting', 'in_progress', 'x_wins', 'o_wins', 'draw']),
  playerX: z.object({ modelId: z.string(), provider: z.string() }),
  playerO: z.object({ modelId: z.string(), provider: z.string() }),
  lastMove: z.object({
    player: z.enum(['X', 'O']),
    row: z.number(),
    col: z.number(),
    modelId: z.string(),
    thinkingTime: z.number().optional()
  }).optional(),
  moveCount: z.number(),
  winner: z.enum(['X', 'O']).nullable().optional(),
  winningLine: z.array(z.object({ row: z.number(), col: z.number() })).nullable().optional(),
  tournamentId: z.string().optional(),
  matchId: z.string().optional(),
  updatedAt: z.string()
})

export type GameStreamData = z.infer<typeof gameStreamSchema>

export const config: StreamConfig = {
  name: 'gameState',
  schema: gameStreamSchema,
  baseConfig: { storageType: 'default' }
}
