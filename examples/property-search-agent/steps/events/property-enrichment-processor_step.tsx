import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">📈</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Data Enrichment</span>
            <span className="text-xs text-gray-400">Additional Property Intel</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded">
            <span className="text-base">🎓</span>
            <span className="text-xs text-blue-300">Schools</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded">
            <span className="text-base">🚨</span>
            <span className="text-xs text-red-300">Crime Stats</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded">
            <span className="text-base">🚶</span>
            <span className="text-xs text-green-300">Walkability</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded">
            <span className="text-base">🚇</span>
            <span className="text-xs text-purple-300">Transit</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs mt-1">
          <span className="text-yellow-400">⚠️</span>
          <span className="text-gray-300">Triggered for high-value properties</span>
        </div>

        <div className="mt-2 px-2 py-1 bg-orange-500/10 rounded border border-orange-500/30">
          <div className="text-xs text-orange-300 font-mono">
            Conditional: Budget &gt; $500k
          </div>
        </div>
      </div>
    </EventNode>
  )
}

