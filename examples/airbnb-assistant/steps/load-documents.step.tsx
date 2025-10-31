import { ApiNode, ApiNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Load Documents</span>
        </div>
        <div className="text-xs text-gray-500">Process & store documents in Pinecone vector DB</div>
      </div>
    </ApiNode>
  )
}
