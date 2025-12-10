import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-green-600">
          ✅ Log Success
        </div>
        <div className="text-xs text-gray-500">
          Google Sheets Logger
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
            Sheets API
          </span>
          <span className="text-xs text-gray-400">→ Log tab</span>
        </div>
      </div>
    </EventNode>
  );
};

