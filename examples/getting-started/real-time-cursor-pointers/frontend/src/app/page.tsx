'use client'

import { useState, useEffect } from 'react'
import { CursorWindowSafe } from '@/components/CursorWindowSafe'

const API_BASE = '/api/cursor'

const DEMO_USERS = [
  { name: 'Dylan George', color: '#22c55e' },
  { name: 'Mark S.', color: '#ec4899' },
  { name: 'Irving B.', color: '#8b5cf6' },
  { name: 'Gemma Scott', color: '#06b6d4' },
]

export default function Home() {
  const [roomName] = useState('public-demo')
  const [userIds, setUserIds] = useState<string[]>([])
  const [isDark, setIsDark] = useState(true)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        await fetch(`${API_BASE}/clear`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName }),
        })
      } catch {}

      const ids = DEMO_USERS.map((_, i) =>
        `user-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`
      )
      setUserIds(ids)
      setIsReady(true)
    }
    init()
  }, [roomName])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  if (!isReady) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Loading demo...</p>
        </div>
      </main>
    )
  }

  return (
    <main className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
      <header className={`border-b ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white/50'} backdrop-blur-xl sticky top-0 z-50`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Realtime Cursors
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://motia.dev"
              target="_blank"
              className={`text-sm font-medium ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'} transition-colors`}
            >
              Powered by Motia
            </a>

            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-yellow-400' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'}`}
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-16 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 mb-6">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className={`text-sm font-medium ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>Live Demo</span>
        </div>

        <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Real-time Cursor Sharing
        </h1>

        <p className={`text-lg max-w-2xl mx-auto mb-8 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Move your mouse inside the windows below. Each window represents a different user.
          Cursors sync instantly across all windows using Motia Streams.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-1 rounded-2xl overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-300'} shadow-2xl`}>
          {DEMO_USERS.map((user, i) => {
            const id = userIds[i]
            if (!id) return null
            return (
              <CursorWindowSafe
                key={id}
                userId={id}
                userName={user.name}
                userColor={user.color}
                roomName={roomName}
                isDark={isDark}
              />
            )
          })}
        </div>

        <div className={`mt-6 flex flex-wrap justify-center gap-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {DEMO_USERS.map((user, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: user.color }} />
              <span>{user.name}</span>
            </div>
          ))}
        </div>
      </div>

      <footer className={`border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'} py-8`}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            Built with{' '}
            <a href="https://motia.dev" target="_blank" className="text-violet-500 hover:underline">
              Motia Streams
            </a>
            {' '}• Real-time without polling
          </p>
        </div>
      </footer>
    </main>
  )
}
