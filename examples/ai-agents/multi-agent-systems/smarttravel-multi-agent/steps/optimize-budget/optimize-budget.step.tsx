import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-center gap-3 p-2">
        <span className="text-3xl">💰</span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-green-700">Budget Agent</span>
          <span className="text-xs text-gray-600">Optimizes costs & spending</span>
        </div>
      </div>
    </EventNode>
  )
}

