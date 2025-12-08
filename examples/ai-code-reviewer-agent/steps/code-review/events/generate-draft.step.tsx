import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

/**
 * Custom GitHub-themed UI for the Generator Agent node
 */
export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2 p-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8957e5] to-[#a371f7] flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-[#f0f6fc]">Generator Agent</div>
            <div className="text-xs text-[#a371f7]">Claude Opus 4.5</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {['bugs', 'security', 'perf', 'style'].map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#8957e5]/20 text-[#a371f7] border border-[#8957e5]/30">
              {tag}
            </span>
          ))}
        </div>
        <div className="text-xs text-[#8b949e] bg-[#161b22] rounded px-2 py-1 border border-[#30363d]">
          Analyzes diff & generates structured findings
        </div>
      </div>
    </EventNode>
  )
}

