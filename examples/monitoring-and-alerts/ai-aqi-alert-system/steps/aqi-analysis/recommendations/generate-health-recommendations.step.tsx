import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-green-600">AI Health Recommendations</span>
            <span className="text-xs text-gray-500">GPT-4 powered analysis</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5 mt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span className="text-gray-700">Health impact assessment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span className="text-gray-700">Activity recommendations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span className="text-gray-700">Protective measures</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span className="text-gray-700">Best time windows</span>
          </div>
        </div>
        
        <div className="mt-2 px-2 py-1 bg-green-50 rounded text-xs text-green-700 font-medium text-center">
          Personalized to user context
        </div>
      </div>
    </EventNode>
  );
};

