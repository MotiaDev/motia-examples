import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🤖</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Market Analyzer</span>
            <span className="text-xs text-gray-400">AI-Powered Insights</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/20 rounded">
          <span className="text-lg">✨</span>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-purple-300">Agno + GPT-4o-mini</span>
            <span className="text-xs text-purple-400">OpenAI Analysis</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">📈</span>
            <span className="text-gray-300">Market trends & conditions</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-blue-400">💰</span>
            <span className="text-gray-300">Price trend analysis</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-yellow-400">🎯</span>
            <span className="text-gray-300">Investment outlook</span>
          </div>
        </div>

        <div className="mt-2 px-2 py-1 bg-purple-500/10 rounded border border-purple-500/30">
          <div className="text-xs text-purple-300 font-mono">
            Parallel: Runs while scraping properties
          </div>
        </div>
      </div>
    </EventNode>
  )
}

