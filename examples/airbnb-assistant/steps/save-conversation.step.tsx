import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Notion-logo.svg/2048px-Notion-logo.svg.png" 
            alt="Notion" 
            className="w-6 h-6 object-contain"
          />
          <span className="text-sm font-medium text-gray-700">Save to Notion</span>
        </div>
        <div className="text-xs text-gray-500">Store conversation history in Notion database</div>
      </div>
    </EventNode>
  )
}
