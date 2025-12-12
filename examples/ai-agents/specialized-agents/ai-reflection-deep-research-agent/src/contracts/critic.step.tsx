/**
 * Custom UI for Critic Event Step
 */

import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <span className="text-lg">🔍</span>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Agent 2 of 3</p>
          <p className="text-xs text-amber-400">Meta-Analysis & Validation</p>
        </div>
      </div>
      <div className="mt-2 text-xs text-zinc-500 bg-zinc-900/50 rounded-lg px-2 py-1">
        Checks for false positives & missed policies
      </div>
    </EventNode>
  )
}


