/**
 * Game Viewer Plugin Component
 * Displays and plays generated games in the Motia Workbench
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'

// Pyodide types
declare global {
  interface Window {
    loadPyodide: (config?: { indexURL?: string }) => Promise<any>
  }
}

interface GameFile {
  filename: string
  content: string
}

interface GameSummary {
  flowId: string
  title: string
  genre: string
  complexity: string
  status: string
  createdAt: string
  completedAt?: string
  qaScore?: number
  qualityGrade?: string
}

interface GameDetails {
  flowId: string
  gameTitle: string
  status: string
  files: GameFile[]
  mainFile: string
  runInstructions: string
  metadata: {
    genre: string
    complexity: string
    qaScore?: number
    qualityGrade?: string
    generatedAt: string
    revisionCount: number
  }
  design?: {
    overview: string
    dependencies: string[]
    architectNotes: string
  }
}

const GameViewer: React.FC = () => {
  const [games, setGames] = useState<GameSummary[]>([])
  const [selectedGame, setSelectedGame] = useState<GameDetails | null>(null)
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)
  
  // Game Player State
  const [isPlaying, setIsPlaying] = useState(false)
  const [pyodide, setPyodide] = useState<any>(null)
  const [pyodideLoading, setPyodideLoading] = useState(false)
  const [gameOutput, setGameOutput] = useState<string[]>([])
  const [gameInput, setGameInput] = useState('')
  const [waitingForInput, setWaitingForInput] = useState(false)
  const [inputResolver, setInputResolver] = useState<((value: string) => void) | null>(null)
  const [gameRunning, setGameRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<'code' | 'play'>('code')
  
  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [gameOutput])

  // Focus input when waiting
  useEffect(() => {
    if (waitingForInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [waitingForInput])

  // Fetch all games on mount
  useEffect(() => {
    fetchGames()
    const interval = setInterval(fetchGames, 5000)
    return () => clearInterval(interval)
  }, [])

  // Load Pyodide script
  const loadPyodideScript = useCallback(async () => {
    if (window.loadPyodide) return true
    
    return new Promise<boolean>((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.head.appendChild(script)
    })
  }, [])

  // Initialize Pyodide
  const initPyodide = useCallback(async () => {
    if (pyodide) return pyodide
    
    setPyodideLoading(true)
    setGameOutput(prev => [...prev, '🔄 Loading Python runtime (Pyodide)...'])
    
    try {
      const scriptLoaded = await loadPyodideScript()
      if (!scriptLoaded) {
        throw new Error('Failed to load Pyodide script')
      }
      
      const py = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
      })
      
      setPyodide(py)
      setGameOutput(prev => [...prev, '✅ Python runtime loaded successfully!', ''])
      return py
    } catch (err: any) {
      setGameOutput(prev => [...prev, `❌ Failed to load Python: ${err.message}`])
      return null
    } finally {
      setPyodideLoading(false)
    }
  }, [pyodide, loadPyodideScript])

  const fetchGames = async () => {
    try {
      const response = await fetch('/__motia/game-viewer/games')
      if (!response.ok) throw new Error('Failed to fetch games')
      const data = await response.json()
      setGames(data.games || [])
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchGameDetails = async (flowId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/__motia/game-viewer/games/${flowId}`)
      if (!response.ok) {
        if (response.status === 425) {
          setError('Game is still generating. Please wait...')
          return
        }
        throw new Error('Failed to fetch game details')
      }
      const data = await response.json()
      setSelectedGame(data)
      setSelectedFile(data.mainFile || data.files?.[0]?.filename || '')
      setError(null)
      setActiveTab('code')
      setIsPlaying(false)
      setGameOutput([])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (content: string) => {
    try {
      setCopying(true)
      await navigator.clipboard.writeText(content)
      setTimeout(() => setCopying(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
      setCopying(false)
    }
  }

  const downloadGame = () => {
    if (!selectedGame) return
    selectedGame.files.forEach(file => {
      const blob = new Blob([file.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  // Check if game uses pygame or other unsupported libraries
  const checkGameCompatibility = (files: GameFile[]): { compatible: boolean; reason?: string } => {
    const allCode = files.map(f => f.content).join('\n')
    
    if (allCode.includes('import pygame') || allCode.includes('from pygame')) {
      return { compatible: false, reason: 'This game uses Pygame which requires a local Python installation.' }
    }
    if (allCode.includes('import tkinter') || allCode.includes('from tkinter')) {
      return { compatible: false, reason: 'This game uses Tkinter GUI which requires a local Python installation.' }
    }
    if (allCode.includes('import curses') || allCode.includes('from curses')) {
      return { compatible: false, reason: 'This game uses curses which requires a terminal environment.' }
    }
    
    return { compatible: true }
  }

  // Run game in Pyodide
  const runGame = async () => {
    if (!selectedGame) return
    
    const compatibility = checkGameCompatibility(selectedGame.files)
    if (!compatibility.compatible) {
      setActiveTab('play')
      setGameOutput([
        '⚠️ Browser Execution Not Supported',
        '',
        compatibility.reason || 'This game cannot run in the browser.',
        '',
        '📥 To play this game:',
        '1. Click "Download All" to get the game files',
        '2. Open a terminal in the download folder',
        `3. Run: ${selectedGame.runInstructions}`,
        '',
        '💡 Console-based games (text adventures, number guessing, etc.) can run directly in the browser!',
      ])
      return
    }
    
    setActiveTab('play')
    setGameOutput([])
    setIsPlaying(true)
    setGameRunning(true)
    
    const py = await initPyodide()
    if (!py) {
      setGameRunning(false)
      return
    }
    
    // Set up custom input/output
    setGameOutput(prev => [...prev, `🎮 Starting "${selectedGame.gameTitle}"...`, '─'.repeat(50), ''])
    
    try {
      // Create a custom input function that waits for user input
      const inputPromise = () => {
        return new Promise<string>((resolve) => {
          setWaitingForInput(true)
          setInputResolver(() => resolve)
        })
      }
      
      // Redirect stdout
      py.setStdout({
        batched: (text: string) => {
          setGameOutput(prev => [...prev, text])
        }
      })
      
      py.setStderr({
        batched: (text: string) => {
          setGameOutput(prev => [...prev, `⚠️ ${text}`])
        }
      })
      
      // Combine all files into modules
      const mainFile = selectedGame.files.find(f => f.filename === selectedGame.mainFile) 
        || selectedGame.files[0]
      
      // Load other modules first
      for (const file of selectedGame.files) {
        if (file.filename !== mainFile.filename && file.filename.endsWith('.py')) {
          const moduleName = file.filename.replace('.py', '')
          py.FS.writeFile(file.filename, file.content)
        }
      }
      
      // Create wrapper code that handles input
      const wrappedCode = `
import sys
from io import StringIO

# Store original input
_original_input = input

# Track if we need async input
_input_queue = []
_input_callback = None

def _custom_input(prompt=""):
    if prompt:
        print(prompt, end="")
    # This will be replaced with JS callback
    raise Exception("INPUT_REQUIRED:" + prompt)

# Replace input function
input = _custom_input

# Game code
${mainFile.content}
`
      
      // Run with input handling
      let code = mainFile.content
      
      // Simple approach: run code and catch input requests
      const runWithInput = async () => {
        let currentCode = code
        let iteration = 0
        const maxIterations = 1000 // Prevent infinite loops
        
        while (iteration < maxIterations) {
          iteration++
          try {
            // Replace input() calls with a marker
            const modifiedCode = `
import sys
_game_inputs = []
_input_index = [0]
_waiting_input = [False]

def custom_input(prompt=""):
    if prompt:
        print(prompt, end="", flush=True)
    _waiting_input[0] = True
    raise StopIteration("NEED_INPUT")

# Monkey-patch input
__builtins__["input"] = custom_input

${currentCode}
`
            await py.runPythonAsync(modifiedCode)
            break // Game completed successfully
          } catch (e: any) {
            const errorStr = String(e)
            if (errorStr.includes('NEED_INPUT') || errorStr.includes('StopIteration')) {
              // Wait for user input
              const userInput = await inputPromise()
              setGameOutput(prev => [...prev, userInput])
              
              // Inject the input and continue
              currentCode = `
_injected_input = "${userInput.replace(/"/g, '\\"')}"
${currentCode.replace(/input\s*\([^)]*\)/, '_injected_input')}
`
            } else if (errorStr.includes('SystemExit') || errorStr.includes('KeyboardInterrupt')) {
              setGameOutput(prev => [...prev, '', '🛑 Game ended.'])
              break
            } else {
              throw e
            }
          }
        }
      }
      
      // Simpler approach: run the whole code
      await py.runPythonAsync(mainFile.content)
      
      setGameOutput(prev => [...prev, '', '─'.repeat(50), '✅ Game finished!'])
      
    } catch (err: any) {
      const errorStr = String(err)
      if (errorStr.includes('SystemExit')) {
        setGameOutput(prev => [...prev, '', '─'.repeat(50), '✅ Game ended.'])
      } else if (errorStr.includes('input')) {
        setGameOutput(prev => [...prev, 
          '', 
          '⚠️ This game requires interactive input.',
          'Interactive input in browser is limited.',
          '',
          '📥 For the best experience:',
          '1. Download the game files',
          `2. Run locally: ${selectedGame.runInstructions}`,
        ])
      } else {
        setGameOutput(prev => [...prev, '', `❌ Error: ${err.message || err}`])
      }
    } finally {
      setGameRunning(false)
      setWaitingForInput(false)
      setInputResolver(null)
    }
  }

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputResolver && gameInput.trim()) {
      inputResolver(gameInput)
      setGameInput('')
      setWaitingForInput(false)
      setInputResolver(null)
    }
  }

  const stopGame = () => {
    setGameRunning(false)
    setWaitingForInput(false)
    setInputResolver(null)
    setGameOutput(prev => [...prev, '', '🛑 Game stopped by user.'])
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e'
      case 'failed': return '#ef4444'
      case 'pending': return '#f59e0b'
      default: return '#3b82f6'
    }
  }

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A': return '#22c55e'
      case 'B': return '#84cc16'
      case 'C': return '#f59e0b'
      case 'D': return '#f97316'
      case 'F': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const currentFile = selectedGame?.files.find(f => f.filename === selectedFile)

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={styles.headerIcon}>🎮</span>
          <span>Game Viewer</span>
        </div>
        <button onClick={fetchGames} style={styles.refreshButton}>
          ↻ Refresh
        </button>
      </div>

      <div style={styles.content}>
        {/* Games List */}
        <div style={styles.gamesList}>
          <div style={styles.sectionTitle}>Generated Games ({games.length})</div>
          
          {loading && games.length === 0 && (
            <div style={styles.loadingText}>Loading games...</div>
          )}
          
          {error && !selectedGame && (
            <div style={styles.errorText}>{error}</div>
          )}

          {games.length === 0 && !loading && (
            <div style={styles.emptyText}>
              No games generated yet.<br />
              Use POST /games/generate to create one!
            </div>
          )}

          {games.map(game => (
            <div
              key={game.flowId}
              style={{
                ...styles.gameCard,
                ...(selectedGame?.flowId === game.flowId ? styles.gameCardSelected : {}),
              }}
              onClick={() => fetchGameDetails(game.flowId)}
            >
              <div style={styles.gameTitle}>{game.title}</div>
              <div style={styles.gameMeta}>
                <span style={styles.badge}>{game.genre}</span>
                <span style={styles.badge}>{game.complexity}</span>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: getStatusColor(game.status),
                }}>
                  {game.status}
                </span>
              </div>
              {game.qaScore !== undefined && (
                <div style={styles.gameScore}>
                  <span>QA: {game.qaScore}/100</span>
                  {game.qualityGrade && (
                    <span style={{
                      ...styles.gradeBadge,
                      backgroundColor: getGradeColor(game.qualityGrade),
                    }}>
                      {game.qualityGrade}
                    </span>
                  )}
                </div>
              )}
              <div style={styles.gameDate}>
                {new Date(game.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Game Details */}
        <div style={styles.detailsPanel}>
          {!selectedGame ? (
            <div style={styles.noSelection}>
              <span style={styles.noSelectionIcon}>👈</span>
              <span>Select a game to view details</span>
            </div>
          ) : (
            <>
              {/* Game Info Header */}
              <div style={styles.detailsHeader}>
                <div>
                  <h2 style={styles.detailsTitle}>{selectedGame.gameTitle}</h2>
                  <div style={styles.detailsMeta}>
                    <span style={styles.badge}>{selectedGame.metadata.genre}</span>
                    <span style={styles.badge}>{selectedGame.metadata.complexity}</span>
                    {selectedGame.metadata.qualityGrade && (
                      <span style={{
                        ...styles.gradeBadge,
                        backgroundColor: getGradeColor(selectedGame.metadata.qualityGrade),
                      }}>
                        Grade: {selectedGame.metadata.qualityGrade}
                      </span>
                    )}
                    {selectedGame.metadata.qaScore !== undefined && (
                      <span style={styles.scoreBadge}>
                        Score: {selectedGame.metadata.qaScore}/100
                      </span>
                    )}
                  </div>
                </div>
                <div style={styles.headerActions}>
                  <button onClick={runGame} style={styles.playButton} disabled={pyodideLoading || gameRunning}>
                    {pyodideLoading ? '⏳ Loading...' : gameRunning ? '🎮 Running...' : '▶ Play Game'}
                  </button>
                  <button onClick={downloadGame} style={styles.downloadButton}>
                    ⬇ Download
                  </button>
                </div>
              </div>

              {/* Run Instructions */}
              <div style={styles.runInstructions} onClick={runGame}>
                <span style={styles.runIcon}>▶</span>
                <code>{selectedGame.runInstructions}</code>
                <span style={styles.runHint}>Click to run in browser</span>
              </div>

              {/* Tab Navigation */}
              <div style={styles.tabNav}>
                <button 
                  style={{...styles.tab, ...(activeTab === 'code' ? styles.tabActive : {})}}
                  onClick={() => setActiveTab('code')}
                >
                  📄 Code
                </button>
                <button 
                  style={{...styles.tab, ...(activeTab === 'play' ? styles.tabActive : {})}}
                  onClick={() => { setActiveTab('play'); if (!isPlaying) runGame(); }}
                >
                  🎮 Play
                </button>
              </div>

              {activeTab === 'code' ? (
                <>
                  {/* Design Overview */}
                  {selectedGame.design && (
                    <div style={styles.designSection}>
                      <div style={styles.designTitle}>📐 Architecture Overview</div>
                      <p style={styles.designText}>{selectedGame.design.overview}</p>
                      {selectedGame.design.dependencies.length > 0 && (
                        <div style={styles.dependencies}>
                          <strong>Dependencies:</strong> {selectedGame.design.dependencies.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* File Tabs */}
                  <div style={styles.fileTabs}>
                    {selectedGame.files.map(file => (
                      <button
                        key={file.filename}
                        style={{
                          ...styles.fileTab,
                          ...(selectedFile === file.filename ? styles.fileTabActive : {}),
                        }}
                        onClick={() => setSelectedFile(file.filename)}
                      >
                        📄 {file.filename}
                        {file.filename === selectedGame.mainFile && (
                          <span style={styles.mainFileBadge}>main</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Code Viewer */}
                  <div style={styles.codeContainer}>
                    <div style={styles.codeHeader}>
                      <span>{selectedFile}</span>
                      <button
                        onClick={() => currentFile && copyToClipboard(currentFile.content)}
                        style={styles.copyButton}
                      >
                        {copying ? '✓ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                    <pre style={styles.codeBlock}>
                      <code>{currentFile?.content || 'No content'}</code>
                    </pre>
                  </div>
                </>
              ) : (
                /* Game Player */
                <div style={styles.gamePlayer}>
                  <div style={styles.terminalHeader}>
                    <span>🖥️ Python Console</span>
                    {gameRunning && (
                      <button onClick={stopGame} style={styles.stopButton}>
                        ⏹ Stop
                      </button>
                    )}
                  </div>
                  <div ref={outputRef} style={styles.terminalOutput}>
                    {gameOutput.map((line, i) => (
                      <div key={i} style={styles.terminalLine}>{line}</div>
                    ))}
                    {waitingForInput && (
                      <form onSubmit={handleInputSubmit} style={styles.inputForm}>
                        <span style={styles.inputPrompt}>{'>'}</span>
                        <input
                          ref={inputRef}
                          type="text"
                          value={gameInput}
                          onChange={(e) => setGameInput(e.target.value)}
                          style={styles.terminalInput}
                          placeholder="Type your input and press Enter..."
                          autoFocus
                        />
                      </form>
                    )}
                  </div>
                  {!gameRunning && gameOutput.length > 0 && (
                    <div style={styles.terminalFooter}>
                      <button onClick={runGame} style={styles.restartButton}>
                        🔄 Run Again
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Stats Footer */}
              <div style={styles.statsFooter}>
                <span>📁 {selectedGame.files.length} files</span>
                <span>📝 {selectedGame.files.reduce((sum, f) => sum + f.content.split('\n').length, 0)} lines</span>
                <span>🔄 {selectedGame.metadata.revisionCount} revisions</span>
                <span>📅 {new Date(selectedGame.metadata.generatedAt).toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#0f0f0f',
    color: '#e5e5e5',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #2a2a2a',
    backgroundColor: '#161616',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 600,
  },
  headerIcon: {
    fontSize: '20px',
  },
  refreshButton: {
    padding: '6px 12px',
    backgroundColor: '#2a2a2a',
    color: '#e5e5e5',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  gamesList: {
    width: '280px',
    borderRight: '1px solid #2a2a2a',
    overflowY: 'auto',
    backgroundColor: '#111111',
  },
  sectionTitle: {
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #2a2a2a',
  },
  gameCard: {
    padding: '12px 16px',
    borderBottom: '1px solid #1a1a1a',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  gameCardSelected: {
    backgroundColor: '#1e3a5f',
  },
  gameTitle: {
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '6px',
    color: '#fff',
  },
  gameMeta: {
    display: 'flex',
    gap: '6px',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  badge: {
    padding: '2px 6px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#aaa',
  },
  statusBadge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#fff',
    fontWeight: 500,
  },
  gameScore: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#888',
    marginBottom: '4px',
  },
  gradeBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#fff',
    fontWeight: 600,
  },
  gameDate: {
    fontSize: '11px',
    color: '#666',
  },
  loadingText: {
    padding: '20px 16px',
    color: '#888',
    textAlign: 'center',
  },
  errorText: {
    padding: '20px 16px',
    color: '#ef4444',
    textAlign: 'center',
  },
  emptyText: {
    padding: '20px 16px',
    color: '#666',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  detailsPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  noSelection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#666',
    gap: '12px',
  },
  noSelectionIcon: {
    fontSize: '32px',
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px',
    borderBottom: '1px solid #2a2a2a',
    backgroundColor: '#161616',
  },
  detailsTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#fff',
  },
  detailsMeta: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  scoreBadge: {
    padding: '2px 8px',
    backgroundColor: '#3b82f6',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#fff',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  playButton: {
    padding: '8px 16px',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  downloadButton: {
    padding: '8px 16px',
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  },
  runInstructions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #2a2a2a',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  runIcon: {
    color: '#22c55e',
  },
  runHint: {
    marginLeft: 'auto',
    fontSize: '11px',
    color: '#666',
  },
  tabNav: {
    display: 'flex',
    gap: '2px',
    padding: '8px 16px',
    backgroundColor: '#111111',
    borderBottom: '1px solid #2a2a2a',
  },
  tab: {
    padding: '8px 16px',
    backgroundColor: '#1a1a1a',
    color: '#888',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  },
  tabActive: {
    backgroundColor: '#2563eb',
    color: '#fff',
  },
  designSection: {
    padding: '12px 16px',
    backgroundColor: '#161616',
    borderBottom: '1px solid #2a2a2a',
  },
  designTitle: {
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#fff',
  },
  designText: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    color: '#aaa',
    lineHeight: 1.5,
  },
  dependencies: {
    fontSize: '11px',
    color: '#888',
  },
  fileTabs: {
    display: 'flex',
    gap: '4px',
    padding: '8px 16px',
    backgroundColor: '#111111',
    borderBottom: '1px solid #2a2a2a',
    overflowX: 'auto',
  },
  fileTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#1a1a1a',
    color: '#888',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  fileTabActive: {
    backgroundColor: '#2563eb',
    color: '#fff',
  },
  mainFileBadge: {
    padding: '1px 4px',
    backgroundColor: '#22c55e',
    borderRadius: '3px',
    fontSize: '9px',
    fontWeight: 600,
  },
  codeContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  codeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#1a1a1a',
    fontSize: '12px',
    color: '#888',
  },
  copyButton: {
    padding: '4px 10px',
    backgroundColor: '#2a2a2a',
    color: '#e5e5e5',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
  },
  codeBlock: {
    flex: 1,
    margin: 0,
    padding: '16px',
    backgroundColor: '#0a0a0a',
    overflow: 'auto',
    fontSize: '12px',
    lineHeight: 1.6,
    color: '#d4d4d4',
  },
  gamePlayer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0a0a0a',
    overflow: 'hidden',
  },
  terminalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #2a2a2a',
    fontSize: '12px',
    color: '#888',
  },
  stopButton: {
    padding: '4px 10px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
  },
  terminalOutput: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '13px',
    lineHeight: 1.6,
  },
  terminalLine: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  inputForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
  },
  inputPrompt: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  terminalInput: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#1a1a1a',
    color: '#e5e5e5',
    border: '1px solid #333',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: "'JetBrains Mono', monospace",
    outline: 'none',
  },
  terminalFooter: {
    padding: '8px 16px',
    backgroundColor: '#1a1a1a',
    borderTop: '1px solid #2a2a2a',
  },
  restartButton: {
    padding: '6px 12px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  statsFooter: {
    display: 'flex',
    gap: '16px',
    padding: '10px 16px',
    backgroundColor: '#161616',
    borderTop: '1px solid #2a2a2a',
    fontSize: '11px',
    color: '#888',
  },
}

export default GameViewer
