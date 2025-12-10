import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🔍</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Property Scraper</span>
            <span className="text-xs text-gray-400">Firecrawl + Parallel Processing</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-blue-400">🌐</span>
            <span className="text-gray-300">Zillow, Realtor.com, Redfin</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-yellow-400">⚡</span>
            <span className="text-gray-300">Parallel URL scraping</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-purple-400">⏱️</span>
            <span className="text-gray-300">15s timeout per URL</span>
          </div>
        </div>

        <div className="mt-2 px-2 py-1 bg-green-500/10 rounded border border-green-500/30">
          <div className="text-xs text-green-400 font-mono">
            Fast: No AI, just raw data extraction
          </div>
        </div>
      </div>
    </EventNode>
  )
}

