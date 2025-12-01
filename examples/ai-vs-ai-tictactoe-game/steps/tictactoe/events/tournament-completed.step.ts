import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { Tournament } from '../../../src/tournament/tournament'
import { formatStandings } from '../../../src/tournament/tournament'

const teamScoreSchema = z.object({
  rank: z.number(),
  provider: z.enum(['anthropic', 'google', 'openai']),
  teamName: z.string(),
  wins: z.number(),
  draws: z.number(),
  losses: z.number(),
  points: z.number(),
  gamesPlayed: z.number()
})

const inputSchema = z.object({
  tournamentId: z.string(),
  winner: teamScoreSchema,
  standings: z.array(teamScoreSchema)
})

export const config: EventConfig = {
  type: 'event',
  name: 'TournamentCompleted',
  description: 'Handles tournament completion',
  subscribes: ['tournament.completed'],
  emits: [],
  input: inputSchema,
  flows: ['tictactoe-tournament']
}

export const handler: Handlers['TournamentCompleted'] = async (input, { state, logger }) => {
  const { tournamentId, winner, standings } = input

  const tournament = await state.get<Tournament>('tournaments', tournamentId)
  if (!tournament) { logger.warn('Tournament not found', { tournamentId }); return }

  logger.info('Tournament Results:\n' + formatStandings(tournament))

  const summary = {
    tournamentId,
    name: tournament.name,
    completedAt: tournament.completedAt,
    winner: { team: winner.teamName, provider: winner.provider, points: winner.points, record: `${winner.wins}W-${winner.draws}D-${winner.losses}L` },
    runnerUp: standings[1] ? { team: standings[1].teamName, provider: standings[1].provider, points: standings[1].points } : null,
    thirdPlace: standings[2] ? { team: standings[2].teamName, provider: standings[2].provider, points: standings[2].points } : null,
    totalMatches: tournament.matches.length,
    modelPerformance: Object.entries(tournament.scores).flatMap(([provider, score]) =>
      Object.entries(score.modelStats).map(([modelId, stats]) => ({
        modelId, provider,
        wins: stats.wins, draws: stats.draws, losses: stats.losses, gamesPlayed: stats.gamesPlayed,
        winRate: stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0
      }))
    ).sort((a, b) => b.winRate - a.winRate)
  }

  await state.set('tournament-results', tournamentId, summary)

  logger.info('🏆 CHAMPION', { champion: winner.teamName, points: winner.points, record: `${winner.wins}W-${winner.draws}D-${winner.losses}L` })
  if (summary.runnerUp) logger.info('🥈 Runner Up', { team: summary.runnerUp.team, points: summary.runnerUp.points })
  if (summary.thirdPlace) logger.info('🥉 Third Place', { team: summary.thirdPlace.team, points: summary.thirdPlace.points })

  logger.info('📊 Top Models', {
    models: summary.modelPerformance.slice(0, 5).map(m => ({ model: m.modelId, winRate: `${m.winRate}%` }))
  })
}
