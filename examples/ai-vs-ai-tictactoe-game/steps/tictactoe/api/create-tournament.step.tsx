/**
 * Custom UI for the Create Tournament step in Workbench
 * Shows tournament bracket preview
 */

import { ApiNode, ApiNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col items-center gap-3 p-2">
        <div className="text-xs text-yellow-400 font-mono uppercase tracking-wider">
          🏆 Create Tournament
        </div>
        
        {/* Team badges */}
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/10 rounded border border-purple-500/30">
            <span className="text-purple-400">🟣</span>
            <span className="text-xs text-purple-300">Team Claude</span>
            <span className="text-[10px] text-purple-400/60 ml-auto">3 models</span>
          </div>
          
          <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 rounded border border-blue-500/30">
            <span className="text-blue-400">🔵</span>
            <span className="text-xs text-blue-300">Team Gemini</span>
            <span className="text-[10px] text-blue-400/60 ml-auto">3 models</span>
          </div>
          
          <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 rounded border border-green-500/30">
            <span className="text-green-400">🟢</span>
            <span className="text-xs text-green-300">Team OpenAI</span>
            <span className="text-[10px] text-green-400/60 ml-auto">3 models</span>
          </div>
        </div>
        
        <div className="text-[10px] text-slate-500">
          54 matches • 3v3 format
        </div>
      </div>
    </ApiNode>
  )
}

