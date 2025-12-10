/** Tic Tac Toe Game Logic */

export type Player = 'X' | 'O'
export type Cell = Player | null
export type Board = [
  [Cell, Cell, Cell],
  [Cell, Cell, Cell],
  [Cell, Cell, Cell]
]

export type Position = { row: number; col: number }
export type GameStatus = 'waiting' | 'in_progress' | 'x_wins' | 'o_wins' | 'draw'

export interface Move {
  player: Player
  position: Position
  timestamp: string
  modelId: string
  thinkingTime?: number
}

export interface GameState {
  id: string
  board: Board
  currentPlayer: Player
  status: GameStatus
  moves: Move[]
  playerX: { modelId: string; provider: string }
  playerO: { modelId: string; provider: string }
  winner?: Player
  winningLine?: Position[]
  createdAt: string
  updatedAt: string
  tournamentId?: string
  matchId?: string
}

export function createEmptyBoard(): Board {
  return [
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ]
}

export function createGame(
  gameId: string,
  playerX: { modelId: string; provider: string },
  playerO: { modelId: string; provider: string },
  tournamentId?: string,
  matchId?: string
): GameState {
  return {
    id: gameId,
    board: createEmptyBoard(),
    currentPlayer: 'X',
    status: 'in_progress',
    moves: [],
    playerX,
    playerO,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tournamentId,
    matchId
  }
}

export function getValidMoves(board: Board): Position[] {
  const moves: Position[] = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (board[row][col] === null) {
        moves.push({ row, col })
      }
    }
  }
  return moves
}

export function isValidMove(board: Board, position: Position): boolean {
  const { row, col } = position
  if (row < 0 || row > 2 || col < 0 || col > 2) return false
  return board[row][col] === null
}

export function makeMove(
  game: GameState,
  position: Position,
  modelId: string,
  thinkingTime?: number
): GameState {
  if (!isValidMove(game.board, position)) {
    throw new Error(`Invalid move: position (${position.row}, ${position.col}) is not available`)
  }

  if (game.status !== 'in_progress') {
    throw new Error(`Game is not in progress: ${game.status}`)
  }

  const newBoard: Board = game.board.map(row => [...row]) as Board
  newBoard[position.row][position.col] = game.currentPlayer

  const move: Move = {
    player: game.currentPlayer,
    position,
    timestamp: new Date().toISOString(),
    modelId,
    thinkingTime
  }

  const { winner, winningLine } = checkWinner(newBoard)
  const validMoves = getValidMoves(newBoard)
  const isDraw = !winner && validMoves.length === 0

  let newStatus: GameStatus = 'in_progress'
  if (winner === 'X') newStatus = 'x_wins'
  else if (winner === 'O') newStatus = 'o_wins'
  else if (isDraw) newStatus = 'draw'

  return {
    ...game,
    board: newBoard,
    currentPlayer: game.currentPlayer === 'X' ? 'O' : 'X',
    status: newStatus,
    moves: [...game.moves, move],
    winner: winner || undefined,
    winningLine: winningLine || undefined,
    updatedAt: new Date().toISOString()
  }
}

export function checkWinner(board: Board): { winner: Player | null; winningLine: Position[] | null } {
  const lines: Position[][] = [
    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
    [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
    [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
    [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }],
    [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
    [{ row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 }],
    [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }],
    [{ row: 0, col: 2 }, { row: 1, col: 1 }, { row: 2, col: 0 }]
  ]

  for (const line of lines) {
    const [a, b, c] = line
    const cellA = board[a.row][a.col]
    const cellB = board[b.row][b.col]
    const cellC = board[c.row][c.col]

    if (cellA && cellA === cellB && cellB === cellC) {
      return { winner: cellA, winningLine: line }
    }
  }

  return { winner: null, winningLine: null }
}

export function formatBoard(board: Board): string {
  const lines: string[] = ['  0   1   2', '┌───┬───┬───┐']
  
  for (let row = 0; row < 3; row++) {
    const cells = board[row].map(cell => cell || ' ')
    lines.push(`${row}│ ${cells[0]} │ ${cells[1]} │ ${cells[2]} │`)
    if (row < 2) lines.push('├───┼───┼───┤')
  }
  
  lines.push('└───┴───┴───┘')
  return lines.join('\n')
}

export function formatBoardForAI(board: Board): string {
  const lines: string[] = ['Board (row, col):', '    0   1   2']
  
  for (let row = 0; row < 3; row++) {
    const cells = board[row].map(cell => cell || '.')
    lines.push(`${row}   ${cells.join('   ')}`)
  }
  
  return lines.join('\n')
}

export function parseAIMove(response: string): Position | null {
  const pattern1 = /(\d)\s*[,\s]\s*(\d)/
  const match1 = response.match(pattern1)
  if (match1) {
    return { row: parseInt(match1[1]), col: parseInt(match1[2]) }
  }

  try {
    const jsonMatch = response.match(/\{[^}]*"row"\s*:\s*(\d)[^}]*"col"\s*:\s*(\d)[^}]*\}/i)
    if (jsonMatch) {
      return { row: parseInt(jsonMatch[1]), col: parseInt(jsonMatch[2]) }
    }
    
    const parsed = JSON.parse(response)
    if (typeof parsed.row === 'number' && typeof parsed.col === 'number') {
      return { row: parsed.row, col: parsed.col }
    }
  } catch {}

  const pattern3 = /row[:\s=]*(\d)[,\s]*col[:\s=]*(\d)/i
  const match3 = response.match(pattern3)
  if (match3) {
    return { row: parseInt(match3[1]), col: parseInt(match3[2]) }
  }

  const digits = response.match(/\d/g)
  if (digits && digits.length >= 2) {
    const row = parseInt(digits[0])
    const col = parseInt(digits[1])
    if (row >= 0 && row <= 2 && col >= 0 && col <= 2) {
      return { row, col }
    }
  }

  return null
}

export function calculateGameStats(game: GameState) {
  const totalMoves = game.moves.length
  const xMoves = game.moves.filter(m => m.player === 'X')
  const oMoves = game.moves.filter(m => m.player === 'O')
  
  const avgThinkingTimeX = xMoves.length > 0 
    ? xMoves.reduce((sum, m) => sum + (m.thinkingTime || 0), 0) / xMoves.length 
    : 0
  
  const avgThinkingTimeO = oMoves.length > 0 
    ? oMoves.reduce((sum, m) => sum + (m.thinkingTime || 0), 0) / oMoves.length 
    : 0

  return {
    totalMoves,
    xMoves: xMoves.length,
    oMoves: oMoves.length,
    avgThinkingTimeX,
    avgThinkingTimeO,
    duration: game.moves.length > 0 
      ? new Date(game.moves[game.moves.length - 1].timestamp).getTime() - new Date(game.createdAt).getTime()
      : 0
  }
}
