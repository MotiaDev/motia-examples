/**
 * Custom UI for the Process AI Move step in Workbench
 * Shows AI thinking animation
 */

import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col items-center gap-2 p-2">
        <div className="text-xs text-amber-400 font-mono">
          🤖 AI Processing
        </div>
        
        <div className="flex items-center gap-2">
          {/* Animated thinking dots */}
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
        
        <div className="text-[10px] text-slate-400 text-center">
          Requesting move from<br/>AI model
        </div>
      </div>
    </EventNode>
  )
}

