/**
 * UI visualization for the webhook step in Motia Workbench
 */
import { ApiNode, ApiNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2">
          <div className="text-2xl">🚗</div>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-gray-800">
              Connected Car Alert Webhook
            </div>
            <div className="text-xs text-gray-500">
              POST /connected_car_alert
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          • Chunks text (400 chars, 40 overlap)
          <br />
          • Creates OpenAI embeddings
          <br />
          • Stores in Motia state
        </div>
      </div>
    </ApiNode>
  )
}

