/**
 * UI visualization for the agent step in Motia Workbench
 */
import { EventNode, EventNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2">
          <div className="text-2xl">🤖</div>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-gray-800">
              AI Agent Processor
            </div>
            <div className="text-xs text-gray-500">
              Subscribes: process-alert
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          • Semantic search with cosine similarity
          <br />
          • GPT-4 chat completion
          <br />
          • Conversation memory (buffer window)
        </div>
      </div>
    </EventNode>
  )
}

