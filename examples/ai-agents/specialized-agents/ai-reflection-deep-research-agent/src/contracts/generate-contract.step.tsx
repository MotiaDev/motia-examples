/**
 * Custom UI for Generate Contract API Step
 */

import { ApiNode, ApiNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Contract Generator</p>
          <p className="text-xs text-pink-400 font-mono">POST /contracts/generate</p>
        </div>
      </div>
    </ApiNode>
  )
}


