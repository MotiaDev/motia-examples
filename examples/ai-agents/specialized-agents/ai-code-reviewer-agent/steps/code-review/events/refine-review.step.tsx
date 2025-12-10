import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

/**
 * Custom GitHub-themed UI for the Refiner Agent node
 */
export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2 p-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3fb950] to-[#56d364] flex items-center justify-center">
            <span className="text-lg">✨</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-[#f0f6fc]">Refiner Agent</div>
            <div className="text-xs text-[#3fb950]">Final Review</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {['prioritize', 'consolidate', 'test-gen'].map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#238636]/20 text-[#3fb950] border border-[#238636]/30">
              {tag}
            </span>
          ))}
        </div>
        <div className="text-xs text-[#8b949e] bg-[#161b22] rounded px-2 py-1 border border-[#30363d]">
          Creates actionable review with code fixes
        </div>
      </div>
    </EventNode>
  )
}

