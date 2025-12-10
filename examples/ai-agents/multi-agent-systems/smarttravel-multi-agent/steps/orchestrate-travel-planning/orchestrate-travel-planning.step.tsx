import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🎯</span>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-purple-600">Orchestrator</span>
            <span className="text-xs text-gray-500">Coordinates all agents</span>
          </div>
        </div>
        <div className="text-xs text-gray-700 bg-purple-50 p-2 rounded mt-1">
          <div className="font-semibold mb-1">Workflow:</div>
          <div className="space-y-1">
            <div>1. 🏛️ Research Destination</div>
            <div>2. ✈️ Search Flights & 🏨 Hotels</div>
            <div>3. 🍽️ Find Dining Options</div>
            <div>4. 📅 Create Itinerary</div>
            <div>5. 💰 Optimize Budget</div>
            <div>6. ✨ Finalize Plan</div>
          </div>
        </div>
      </div>
    </EventNode>
  )
}

