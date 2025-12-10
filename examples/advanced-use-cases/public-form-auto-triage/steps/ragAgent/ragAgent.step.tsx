import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-indigo-600">
          🤖 RAG Agent
        </div>
        <div className="text-xs text-gray-500">
          Query vectors + Claude AI
        </div>
        <div className="flex gap-2 mt-1">
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
            Vector Search
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            Anthropic
          </span>
        </div>
      </div>
    </EventNode>
  );
};

