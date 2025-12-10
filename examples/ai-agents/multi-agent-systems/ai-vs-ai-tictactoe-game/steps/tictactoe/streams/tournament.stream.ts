import { StreamConfig } from 'motia'
import { z } from 'zod'

const teamScoreSchema = z.object({
  provider: z.enum(['anthropic', 'google', 'openai']),
  teamName: z.string(),
  wins: z.number(),
  draws: z.number(),
  losses: z.number(),
  points: z.number(),
  gamesPlayed: z.number()
})

const matchSchema = z.object({
  id: z.string(),
  playerXTeam: z.enum(['anthropic', 'google', 'openai']),
  playerOTeam: z.enum(['anthropic', 'google', 'openai']),
  playerXModel: z.string(),
  playerOModel: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  winner: z.enum(['anthropic', 'google', 'openai', 'draw']).optional(),
  round: z.number()
})

export const tournamentStreamSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  standings: z.array(teamScoreSchema),
  currentMatch: matchSchema.optional(),
  progress: z.object({ completedMatches: z.number(), totalMatches: z.number(), percentage: z.number() }),
  currentRound: z.number(),
  totalRounds: z.number(),
  updatedAt: z.string()
})

export type TournamentStreamData = z.infer<typeof tournamentStreamSchema>

export const config: StreamConfig = {
  name: 'tournamentState',
  schema: tournamentStreamSchema,
  baseConfig: { storageType: 'default' }
}
