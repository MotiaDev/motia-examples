'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useStreamGroup } from '@motiadev/stream-client-react'
import { Cursor } from './Cursor'

interface CursorData {
  id: string
  x: number
  y: number
  username: string
  color: string
  lastUpdated: string
}

interface CursorWindowProps {
  userId: string
  userName: string
  userColor: string
  roomName: string
  isDark?: boolean
}

const API_URL = '/api/cursor'
const MIN_INTERVAL_MS = 100

export function CursorWindow({
  userId,
  userName,
  userColor,
  roomName,
  isDark = true,
}: CursorWindowProps) {
  const { data: cursors } = useStreamGroup<CursorData>({
    streamName: 'cursorPosition',
    groupId: roomName,
  })

  const [isConnected, setIsConnected] = useState(false)
  const [localCursor, setLocalCursor] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastSentRef = useRef<number>(0)
  const pendingRef = useRef<{ x: number; y: number } | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const remoteCursors = (cursors || []).filter((c): c is CursorData =>
    c != null &&
    typeof c.id === 'string' &&
    c.id !== userId &&
    (c.x !== 0 || c.y !== 0)
  )

  const sendNow = useCallback((x: number, y: number) => {
    if (!isConnected) return
    lastSentRef.current = Date.now()

    fetch(`${API_URL}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName,
        userId,
        x: Math.round(x),
        y: Math.round(y),
        username: userName,
        color: userColor,
      }),
    }).catch(() => {})
  }, [isConnected, roomName, userId, userName, userColor])

  const sendUpdate = useCallback((x: number, y: number) => {
    const now = Date.now()
    const elapsed = now - lastSentRef.current

    if (elapsed >= MIN_INTERVAL_MS) {
      sendNow(x, y)
      pendingRef.current = null
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    } else {
      pendingRef.current = { x, y }
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null
          if (pendingRef.current) {
            sendNow(pendingRef.current.x, pendingRef.current.y)
            pendingRef.current = null
          }
        }, MIN_INTERVAL_MS - elapsed)
      }
    }
  }, [sendNow])

  useEffect(() => {
    let mounted = true

    fetch(`${API_URL}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, userId, username: userName, color: userColor }),
    })
      .then(res => { if (res.ok && mounted) setIsConnected(true) })
      .catch(() => {})

    return () => {
      mounted = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      navigator.sendBeacon?.(
        `${API_URL}/leave`,
        new Blob([JSON.stringify({ roomName, userId })], { type: 'application/json' })
      )
    }
  }, [roomName, userId, userName, userColor])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setLocalCursor({ x, y })
    sendUpdate(x, y)
  }, [sendUpdate])

  return (
    <div
      ref={containerRef}
      className={`relative h-64 md:h-80 overflow-hidden transition-colors cursor-none ${
        isDark ? 'bg-zinc-900' : 'bg-white'
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setLocalCursor(null)}
    >
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: userColor }} />
        <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {userName}
        </span>
        {isConnected && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
      </div>

      {localCursor && (
        <Cursor x={localCursor.x} y={localCursor.y} name={userName} color={userColor} isLocal />
      )}

      {remoteCursors.map((cursor) => (
        <Cursor
          key={cursor.id}
          x={cursor.x}
          y={cursor.y}
          name={cursor.username}
          color={cursor.color}
        />
      ))}

      {!localCursor && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${
          isDark ? 'text-zinc-700' : 'text-zinc-300'
        }`}>
          <p className="text-sm">Move cursor here</p>
        </div>
      )}
    </div>
  )
}
