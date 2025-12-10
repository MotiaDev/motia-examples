import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-center gap-3 p-2">
        <span className="text-3xl">📅</span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-indigo-700">Itinerary Specialist</span>
          <span className="text-xs text-gray-600">Crafts day-by-day schedules</span>
        </div>
      </div>
    </EventNode>
  )
}

