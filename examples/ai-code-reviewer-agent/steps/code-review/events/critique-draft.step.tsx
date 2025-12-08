import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

/**
 * Custom GitHub-themed UI for the Critic Agent node
 */
export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2 p-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f78166] to-[#ff7b72] flex items-center justify-center">
            <span className="text-lg">🔍</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-[#f0f6fc]">Critic Agent</div>
            <div className="text-xs text-[#f78166]">Meta-Analysis</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {['accuracy', 'completeness', 'actionability'].map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#f78166]/20 text-[#ff7b72] border border-[#f78166]/30">
              {tag}
            </span>
          ))}
        </div>
        <div className="text-xs text-[#8b949e] bg-[#161b22] rounded px-2 py-1 border border-[#30363d]">
          Validates findings & identifies missed issues
        </div>
      </div>
    </EventNode>
  )
}

