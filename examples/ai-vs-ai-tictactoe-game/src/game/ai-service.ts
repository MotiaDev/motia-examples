/** AI Service for Tic Tac Toe moves using OpenAI, Anthropic, and Google */

import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { Board, Player, Position } from './logic'
import { formatBoardForAI, getValidMoves, parseAIMove, isValidMove } from './logic'
import { getModelById, type ModelProvider } from '../models/config'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY })

function getModel(provider: ModelProvider, modelId: string) {
  switch (provider) {
    case 'openai': return openai(modelId)
    case 'anthropic': return anthropic(modelId)
    case 'google': return google(modelId)
    default: throw new Error(`Unsupported provider: ${provider}`)
  }
}

function generatePrompt(board: Board, player: Player, moveHistory: string[], validMoves: Position[]): string {
  const boardStr = formatBoardForAI(board)
  const validMovesStr = validMoves.map(m => `(${m.row}, ${m.col})`).join(', ')
  
  return `You are playing Tic Tac Toe as ${player}. Your goal is to win by placing three ${player}'s in a row.

Current Board:
${boardStr}

Legend: X = Player X, O = Player O, . = Empty

Move History:
${moveHistory.length > 0 ? moveHistory.join('\n') : 'No moves yet'}

Valid Moves (row, col): ${validMovesStr}

RULES:
1. Only place in empty cells (.)
2. Choose from valid moves above
3. Block opponent's winning moves
4. Create winning opportunities

YOUR RESPONSE: ONLY two numbers - row column (e.g., "1 2")
- First number = row (0-2)
- Second number = column (0-2)
- NO other text`
}

export interface AIResponse {
  move: Position
  rawResponse: string
  thinkingTime: number
  modelId: string
  provider: ModelProvider
  success: boolean
  error?: string
  retries: number
}

export async function requestAIMove(
  board: Board,
  player: Player,
  modelId: string,
  provider: ModelProvider,
  moveHistory: string[] = [],
  maxRetries: number = 3
): Promise<AIResponse> {
  const validMoves = getValidMoves(board)
  
  if (validMoves.length === 0) {
    throw new Error('No valid moves available')
  }

  const prompt = generatePrompt(board, player, moveHistory, validMoves)
  const startTime = Date.now()
  
  let lastError: string | undefined
  let lastResponse: string = ''
  let retries = 0

  while (retries < maxRetries) {
    try {
      const model = getModel(provider, modelId)
      
      const result = await generateText({
        model,
        prompt,
        maxTokens: 50,
        temperature: 0.3,
      })

      lastResponse = result.text.trim()
      const parsedMove = parseAIMove(lastResponse)

      if (parsedMove && isValidMove(board, parsedMove)) {
        return {
          move: parsedMove,
          rawResponse: lastResponse,
          thinkingTime: Date.now() - startTime,
          modelId,
          provider,
          success: true,
          retries
        }
      }

      lastError = `Invalid move: ${JSON.stringify(parsedMove)} from "${lastResponse}"`
      retries++
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      retries++
    }
  }

  const fallbackMove = validMoves[Math.floor(Math.random() * validMoves.length)]
  
  return {
    move: fallbackMove,
    rawResponse: lastResponse,
    thinkingTime: Date.now() - startTime,
    modelId,
    provider,
    success: false,
    error: `Failed after ${maxRetries} retries: ${lastError}. Using fallback.`,
    retries
  }
}

export function formatMoveForHistory(moveNumber: number, player: Player, position: Position, modelId: string): string {
  return `Move ${moveNumber}: ${player} at (${position.row}, ${position.col}) by ${modelId}`
}

export function getModelDisplayInfo(modelId: string) {
  const model = getModelById(modelId)
  if (model) {
    return { name: model.displayName, provider: model.provider, category: model.category }
  }
  return { name: modelId, provider: 'unknown', category: 'unknown' }
}
