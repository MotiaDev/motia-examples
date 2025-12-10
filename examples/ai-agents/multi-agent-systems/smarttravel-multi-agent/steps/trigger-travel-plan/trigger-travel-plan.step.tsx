import { ApiNode, ApiNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-blue-600">SmartTravel</span>
            <span className="text-xs text-gray-500">POST /api/travel-plan/trigger</span>
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          Multi-agent system with 6 specialized AI agents
        </div>
      </div>
    </ApiNode>
  )
}

