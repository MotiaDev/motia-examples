import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-red-600">
          🚨 Error Alert
        </div>
        <div className="text-xs text-gray-500">
          Slack Notification
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
            #alerts
          </span>
          <span className="text-xs text-gray-400">on failure</span>
        </div>
      </div>
    </EventNode>
  );
};

