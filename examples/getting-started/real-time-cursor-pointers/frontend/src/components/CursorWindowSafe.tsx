'use client'

import { Component } from 'react'
import { CursorWindow } from './CursorWindow'

interface Props {
  userId: string
  userName: string
  userColor: string
  roomName: string
  isDark?: boolean
}

interface State {
  hasError: boolean
}

class CursorWindowErrorBoundary extends Component<Props, State> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null

  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidUpdate(_: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      this.retryTimeout = setTimeout(() => {
        this.setState({ hasError: false })
      }, 500)
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) clearTimeout(this.retryTimeout)
  }

  render() {
    const { isDark = true, userName, userColor } = this.props

    if (this.state.hasError) {
      return (
        <div className={`relative h-64 md:h-80 overflow-hidden ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
          <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: userColor }} />
            <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {userName}
            </span>
            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
          </div>
          <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`}>
            <p className="text-sm">Reconnecting...</p>
          </div>
        </div>
      )
    }

    return <CursorWindow {...this.props} />
  }
}

export { CursorWindowErrorBoundary as CursorWindowSafe }
