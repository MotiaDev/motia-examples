import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-gray-700">Google Sheets Logger</div>
            <div className="text-xs text-gray-500">Log processing results</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs">📝</span>
          <div className="text-xs text-gray-400">Sheet: GitHub Commit Jenkins / Log</div>
        </div>
      </div>
    </EventNode>
  );
};

