/**
 * Custom UI for the Create Game step in Workbench
 * Shows a beautiful game board visualization
 */

import { ApiNode, ApiNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col items-center gap-3 p-2">
        <div className="text-xs text-emerald-400 font-mono uppercase tracking-wider">
          🎮 Create AI Game
        </div>
        
        {/* Mini board preview */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/50 p-2 rounded-lg border border-slate-700">
          {[...Array(9)].map((_, i) => (
            <div 
              key={i}
              className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center text-xs font-bold"
            >
              {i === 4 ? (
                <span className="text-cyan-400">?</span>
              ) : (
                <span className="text-slate-600">·</span>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 text-[10px]">
          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">Claude</span>
          <span className="text-slate-500">vs</span>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">Gemini</span>
          <span className="text-slate-500">vs</span>
          <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full">OpenAI</span>
        </div>
      </div>
    </ApiNode>
  )
}

