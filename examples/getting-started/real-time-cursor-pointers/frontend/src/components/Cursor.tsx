'use client'

import { useEffect, useRef } from 'react'

interface CursorProps {
  x: number
  y: number
  name: string
  color: string
  isLocal?: boolean
}

export function Cursor({ x, y, name, color, isLocal = false }: CursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null)
  const positionRef = useRef({ x, y })
  const targetRef = useRef({ x, y })
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (isLocal && cursorRef.current) {
      cursorRef.current.style.transform = `translate(${x}px, ${y}px)`
      positionRef.current = { x, y }
      targetRef.current = { x, y }
      return
    }

    targetRef.current = { x, y }

    if (!animationRef.current) {
      const animate = () => {
        const current = positionRef.current
        const target = targetRef.current

        const dx = target.x - current.x
        const dy = target.y - current.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance > 0.5) {
          current.x += dx * 0.35
          current.y += dy * 0.35

          if (cursorRef.current) {
            cursorRef.current.style.transform = `translate(${current.x}px, ${current.y}px)`
          }

          animationRef.current = requestAnimationFrame(animate)
        } else {
          current.x = target.x
          current.y = target.y

          if (cursorRef.current) {
            cursorRef.current.style.transform = `translate(${current.x}px, ${current.y}px)`
          }

          animationRef.current = null
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }
  }, [x, y, isLocal])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      className="absolute pointer-events-none z-50"
      style={{ transform: `translate(${x}px, ${y}px)`, willChange: 'transform' }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.86.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      <div
        className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-md"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  )
}
