import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">RAG Agent</div>
            <div className="text-xs text-gray-500">Anthropic Claude</div>
          </div>
        </div>
        <div className="text-xs text-gray-400 font-mono">
          Analyzes pricing with context
        </div>
      </div>
    </EventNode>
  )
}
