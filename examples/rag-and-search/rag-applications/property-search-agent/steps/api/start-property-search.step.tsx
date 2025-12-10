import { ApiNode, ApiNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Property Search</span>
            <span className="text-xs text-gray-400">Initiate parallel search</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-1">
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded text-xs">
            <span>🔍</span>
            <span className="text-blue-300">Scraping</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded text-xs">
            <span>🤖</span>
            <span className="text-purple-300">AI Analysis</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded text-xs">
            <span>📊</span>
            <span className="text-green-300">Market Data</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded text-xs">
            <span>🏘️</span>
            <span className="text-orange-300">Neighborhoods</span>
          </div>
        </div>

        <div className="text-xs text-gray-500 mt-1 italic">
          Triggers 4 parallel event processors
        </div>
      </div>
    </ApiNode>
  )
}

