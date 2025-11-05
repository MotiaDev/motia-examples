import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🏘️</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Neighborhood Analyzer</span>
            <span className="text-xs text-gray-400">Area Quality Scoring</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between px-2 py-1 bg-green-500/10 rounded">
            <div className="flex items-center gap-2">
              <span className="text-base">🌳</span>
              <span className="text-xs text-gray-300">Parks & Recreation</span>
            </div>
            <span className="text-xs text-green-400 font-semibold">Score</span>
          </div>
          
          <div className="flex items-center justify-between px-2 py-1 bg-blue-500/10 rounded">
            <div className="flex items-center gap-2">
              <span className="text-base">🏪</span>
              <span className="text-xs text-gray-300">Local Amenities</span>
            </div>
            <span className="text-xs text-blue-400 font-semibold">Score</span>
          </div>
          
          <div className="flex items-center justify-between px-2 py-1 bg-red-500/10 rounded">
            <div className="flex items-center gap-2">
              <span className="text-base">🛡️</span>
              <span className="text-xs text-gray-300">Safety Rating</span>
            </div>
            <span className="text-xs text-red-400 font-semibold">Score</span>
          </div>
        </div>

        <div className="mt-2 px-2 py-1 bg-indigo-500/10 rounded border border-indigo-500/30">
          <div className="text-xs text-indigo-300 font-mono">
            Based on user preferences (special features)
          </div>
        </div>
      </div>
    </EventNode>
  )
}

