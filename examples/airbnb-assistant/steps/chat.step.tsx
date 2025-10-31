import { ApiNode, ApiNodeProps } from 'motia/workbench'
import React from 'react'

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {/* Airbnb Logo */}
          <img 
            src="https://img.favpng.com/9/3/24/airbnb-logo-travel-png-favpng-C5FTvbpB52WK1f6aJ4RQgMMUe.jpg" 
            alt="Airbnb" 
            className="w-10 h-10 rounded-full object-cover shadow-sm border-2 border-red-50"
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">Airbnb Guest Assistant</span>
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Live</span>
            </div>
            <span className="text-xs text-gray-500">Chat API Endpoint</span>
          </div>
        </div>
        <div className="text-xs text-gray-600 pl-13">
          RAG-powered AI chat with Pinecone vector search, OpenAI GPT-4, SerpAPI local search & Notion history
        </div>
        <div className="flex gap-1 mt-1 flex-wrap pl-13">
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">OpenAI</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Pinecone</span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">SerpAPI</span>
          <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded">Notion</span>
        </div>
      </div>
    </ApiNode>
  )
}
