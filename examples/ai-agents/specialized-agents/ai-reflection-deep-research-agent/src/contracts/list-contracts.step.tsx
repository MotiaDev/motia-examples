/**
 * Custom UI for List Contracts API Step
 */

import { ApiNode, ApiNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-zinc-600 flex items-center justify-center shadow-lg shadow-slate-500/20">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </div>
        <div>
          <p className="text-xs text-zinc-400">List All</p>
          <p className="text-xs text-slate-400 font-mono">GET /contracts</p>
        </div>
      </div>
    </ApiNode>
  )
}


