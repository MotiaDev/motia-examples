import { ApiNode, ApiNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📦</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Get Results</span>
            <span className="text-xs text-gray-400">Retrieve property data</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">✓</span>
            <span className="text-gray-300">Properties with prices</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">✓</span>
            <span className="text-gray-300">Market analysis</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">✓</span>
            <span className="text-gray-300">Enriched data</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">✓</span>
            <span className="text-gray-300">Neighborhood scores</span>
          </div>
        </div>

        <div className="text-xs text-gray-500 mt-1 italic">
          Returns aggregated results from all processors
        </div>
      </div>
    </ApiNode>
  )
}

