/** Tournament System for AI Tic Tac Toe */

import type { ModelProvider } from '../models/config'
import type { GameState } from '../game/logic'

export type TournamentStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface TeamScore {
  provider: ModelProvider
  teamName: string
  wins: number
  draws: number
  losses: number
  points: number
  gamesPlayed: number
  modelStats: Record<string, { wins: number; draws: number; losses: number; gamesPlayed: number; avgThinkingTime: number }>
}

export interface Match {
  id: string
  tournamentId: string
  playerXTeam: ModelProvider
  playerOTeam: ModelProvider
  playerXModel: string
  playerOModel: string
  gameId?: string
  status: 'pending' | 'in_progress' | 'completed'
  winner?: ModelProvider | 'draw'
  round: number
  createdAt: string
  completedAt?: string
}

export interface Tournament {
  id: string
  name: string
  status: TournamentStatus
  teams: { anthropic: { name: string; models: string[] }; google: { name: string; models: string[] }; openai: { name: string; models: string[] } }
  matches: Match[]
  scores: Record<ModelProvider, TeamScore>
  currentRound: number
  totalRounds: number
  currentMatchIndex: number
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export function generateMatchSchedule(tournamentId: string, teams: Tournament['teams']): Match[] {
  const matches: Match[] = []
  const providers: ModelProvider[] = ['anthropic', 'google', 'openai']
  let matchId = 1
  let round = 1

  for (let i = 0; i < providers.length; i++) {
    for (let j = i + 1; j < providers.length; j++) {
      const teamA = providers[i]
      const teamB = providers[j]
      const modelsA = teams[teamA].models.slice(0, 2)
      const modelsB = teams[teamB].models.slice(0, 2)

      for (const modelA of modelsA) {
        for (const modelB of modelsB) {
          const isEven = matchId % 2 === 0
          matches.push({
            id: `match-${matchId++}`,
            tournamentId,
            playerXTeam: isEven ? teamB : teamA,
            playerOTeam: isEven ? teamA : teamB,
            playerXModel: isEven ? modelB : modelA,
            playerOModel: isEven ? modelA : modelB,
            status: 'pending',
            round,
            createdAt: new Date().toISOString()
          })
        }
      }
      round++
    }
  }

  const topModels = [
    { team: 'anthropic' as ModelProvider, model: teams.anthropic.models[0] },
    { team: 'google' as ModelProvider, model: teams.google.models[0] },
    { team: 'openai' as ModelProvider, model: teams.openai.models[0] }
  ]

  for (let i = 0; i < topModels.length; i++) {
    for (let j = i + 1; j < topModels.length; j++) {
      matches.push({
        id: `match-${matchId++}`,
        tournamentId,
        playerXTeam: topModels[i].team,
        playerOTeam: topModels[j].team,
        playerXModel: topModels[i].model,
        playerOModel: topModels[j].model,
        status: 'pending',
        round,
        createdAt: new Date().toISOString()
      })
    }
  }

  return matches
}

export function createInitialScores(): Record<ModelProvider, TeamScore> {
  const createTeamScore = (provider: ModelProvider, teamName: string): TeamScore => ({
    provider, teamName, wins: 0, draws: 0, losses: 0, points: 0, gamesPlayed: 0, modelStats: {}
  })

  return {
    anthropic: createTeamScore('anthropic', 'Team Claude'),
    google: createTeamScore('google', 'Team Gemini'),
    openai: createTeamScore('openai', 'Team OpenAI')
  }
}

export function createTournament(tournamentId: string, name: string, teams: Tournament['teams']): Tournament {
  const matches = generateMatchSchedule(tournamentId, teams)
  const totalRounds = Math.max(...matches.map(m => m.round))

  return {
    id: tournamentId,
    name,
    status: 'pending',
    teams,
    matches,
    scores: createInitialScores(),
    currentRound: 1,
    totalRounds,
    currentMatchIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

export function updateTournamentAfterGame(tournament: Tournament, matchId: string, game: GameState): Tournament {
  const matchIndex = tournament.matches.findIndex(m => m.id === matchId)
  if (matchIndex === -1) throw new Error(`Match ${matchId} not found`)

  const match = tournament.matches[matchIndex]
  const updatedMatches = [...tournament.matches]
  const updatedScores = { ...tournament.scores }

  let winner: ModelProvider | 'draw'
  if (game.status === 'x_wins') winner = match.playerXTeam
  else if (game.status === 'o_wins') winner = match.playerOTeam
  else winner = 'draw'

  updatedMatches[matchIndex] = { ...match, gameId: game.id, status: 'completed', winner, completedAt: new Date().toISOString() }

  const xTeam = match.playerXTeam
  const oTeam = match.playerOTeam

  const xScore = { ...updatedScores[xTeam] }
  xScore.gamesPlayed++
  if (winner === xTeam) { xScore.wins++; xScore.points += 3 }
  else if (winner === 'draw') { xScore.draws++; xScore.points += 1 }
  else xScore.losses++

  if (!xScore.modelStats[match.playerXModel]) {
    xScore.modelStats[match.playerXModel] = { wins: 0, draws: 0, losses: 0, gamesPlayed: 0, avgThinkingTime: 0 }
  }
  const xModelStats = xScore.modelStats[match.playerXModel]
  xModelStats.gamesPlayed++
  if (winner === xTeam) xModelStats.wins++
  else if (winner === 'draw') xModelStats.draws++
  else xModelStats.losses++
  updatedScores[xTeam] = xScore

  const oScore = { ...updatedScores[oTeam] }
  oScore.gamesPlayed++
  if (winner === oTeam) { oScore.wins++; oScore.points += 3 }
  else if (winner === 'draw') { oScore.draws++; oScore.points += 1 }
  else oScore.losses++

  if (!oScore.modelStats[match.playerOModel]) {
    oScore.modelStats[match.playerOModel] = { wins: 0, draws: 0, losses: 0, gamesPlayed: 0, avgThinkingTime: 0 }
  }
  const oModelStats = oScore.modelStats[match.playerOModel]
  oModelStats.gamesPlayed++
  if (winner === oTeam) oModelStats.wins++
  else if (winner === 'draw') oModelStats.draws++
  else oModelStats.losses++
  updatedScores[oTeam] = oScore

  const allCompleted = updatedMatches.every(m => m.status === 'completed')
  const nextPendingIndex = updatedMatches.findIndex(m => m.status === 'pending')

  return {
    ...tournament,
    matches: updatedMatches,
    scores: updatedScores,
    status: allCompleted ? 'completed' : 'in_progress',
    currentMatchIndex: nextPendingIndex >= 0 ? nextPendingIndex : tournament.currentMatchIndex,
    currentRound: nextPendingIndex >= 0 ? updatedMatches[nextPendingIndex].round : tournament.currentRound,
    updatedAt: new Date().toISOString(),
    completedAt: allCompleted ? new Date().toISOString() : undefined
  }
}

export function getNextPendingMatch(tournament: Tournament): Match | null {
  return tournament.matches.find(m => m.status === 'pending') || null
}

export function getTournamentStandings(tournament: Tournament): TeamScore[] {
  return Object.values(tournament.scores).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    return (b.wins - b.losses) - (a.wins - a.losses)
  })
}

export function formatStandings(tournament: Tournament): string {
  const standings = getTournamentStandings(tournament)
  const lines: string[] = ['🏆 TOURNAMENT STANDINGS', '═'.repeat(50)]
  
  standings.forEach((team, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
    lines.push(`${medal} ${team.teamName}`)
    lines.push(`   Points: ${team.points} | W: ${team.wins} | D: ${team.draws} | L: ${team.losses}`)
    lines.push(`   Games: ${team.gamesPlayed}`)
    lines.push('')
  })

  return lines.join('\n')
}

export function getTournamentSummary(tournament: Tournament) {
  const standings = getTournamentStandings(tournament)
  const completedMatches = tournament.matches.filter(m => m.status === 'completed').length
  const totalMatches = tournament.matches.length

  return {
    id: tournament.id,
    name: tournament.name,
    status: tournament.status,
    progress: { completedMatches, totalMatches, percentage: Math.round((completedMatches / totalMatches) * 100) },
    standings: standings.map((team, index) => ({ rank: index + 1, ...team })),
    winner: tournament.status === 'completed' ? standings[0] : null
  }
}
