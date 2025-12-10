/**
 * UI visualization for the Google Sheets logger step in Motia Workbench
 */
import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2">
          <div className="text-2xl">📊</div>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-gray-800">
              Google Sheets Logger
            </div>
            <div className="text-xs text-gray-500">
              Subscribes: log-result
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          • Appends to Google Sheets
          <br />
          • Logs query, response, and metadata
        </div>
      </div>
    </EventNode>
  )
}

