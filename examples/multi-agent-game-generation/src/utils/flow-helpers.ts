/**
 * Flow Helper Utilities
 * Common utilities for game generation flow management
 */
import { v4 as uuidv4 } from 'uuid'

export interface FlowMetadata {
  flowId: string
  status: 'pending' | 'designing' | 'coding' | 'qa_review' | 'final_review' | 'completed' | 'failed' | 'revision'
  currentStep: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  error?: string
  revisionCount: number
  maxRevisions: number
}

export interface GameGenerationState {
  metadata: FlowMetadata
  spec: any
  design?: any
  code?: any
  qaReport?: any
  finalValidation?: any
  logs: {
    timestamp: string
    step: string
    message: string
    level: 'info' | 'warn' | 'error'
  }[]
}

export function createFlowId(): string {
  return `game-${uuidv4()}`
}

export function createInitialState(flowId: string, spec: any): GameGenerationState {
  const now = new Date().toISOString()
  
  return {
    metadata: {
      flowId,
      status: 'pending',
      currentStep: 'initialization',
      createdAt: now,
      updatedAt: now,
      revisionCount: 0,
      maxRevisions: 3, // Maximum 3 revision cycles
    },
    spec,
    logs: [{
      timestamp: now,
      step: 'initialization',
      message: `Game generation flow started for "${spec.title}"`,
      level: 'info',
    }],
  }
}

export function addLog(
  state: GameGenerationState, 
  step: string, 
  message: string, 
  level: 'info' | 'warn' | 'error' = 'info'
): GameGenerationState {
  return {
    ...state,
    logs: [
      ...state.logs,
      {
        timestamp: new Date().toISOString(),
        step,
        message,
        level,
      },
    ],
    metadata: {
      ...state.metadata,
      updatedAt: new Date().toISOString(),
    },
  }
}

export function updateStatus(
  state: GameGenerationState,
  status: FlowMetadata['status'],
  currentStep: string
): GameGenerationState {
  return {
    ...state,
    metadata: {
      ...state.metadata,
      status,
      currentStep,
      updatedAt: new Date().toISOString(),
      ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
    },
  }
}

export function setError(
  state: GameGenerationState,
  error: string
): GameGenerationState {
  return {
    ...state,
    metadata: {
      ...state.metadata,
      status: 'failed',
      error,
      updatedAt: new Date().toISOString(),
    },
  }
}

/**
 * Format game files for download
 */
export function formatGameFilesForDownload(code: any): {
  files: { filename: string; content: string }[]
  mainFile: string
  runInstructions: string
} {
  return {
    files: code.files.map((f: any) => ({
      filename: f.filename,
      content: f.content,
    })),
    mainFile: code.mainEntrypoint,
    runInstructions: code.runInstructions,
  }
}

