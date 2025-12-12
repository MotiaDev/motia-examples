/**
 * Custom UI for Analysis Completed Event Step
 */

import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
          <span className="text-lg">✅</span>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Success Handler</p>
          <p className="text-xs text-green-400">Logs metrics & audit trail</p>
        </div>
      </div>
    </EventNode>
  )
}


