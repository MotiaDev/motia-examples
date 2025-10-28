import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-purple-600">
          ⚙️ Text Processing
        </div>
        <div className="text-xs text-gray-500">
          Split → Embed → Store
        </div>
        <div className="flex gap-2 mt-1">
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
            Cohere
          </span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
            Supabase
          </span>
        </div>
      </div>
    </EventNode>
  );
};

