import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-gray-700">RAG Agent</div>
            <div className="text-xs text-gray-500">AI-powered commit analysis</div>
          </div>
        </div>
        <div className="flex flex-col gap-1 mt-2 p-2 bg-gray-50 rounded">
          <div className="flex items-center gap-2">
            <span className="text-xs">🔍</span>
            <div className="text-xs text-gray-600">Vector Store Query</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">💭</span>
            <div className="text-xs text-gray-600">Window Memory Buffer</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">🤖</span>
            <div className="text-xs text-gray-600">OpenAI Chat Model</div>
          </div>
        </div>
      </div>
    </EventNode>
  );
};

