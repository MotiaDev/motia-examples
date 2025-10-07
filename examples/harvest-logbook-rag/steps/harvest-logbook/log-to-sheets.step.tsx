/**
 * UI Step for Log to Sheets
 * Custom visualization for Google Sheets logging
 */

import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-gray-700">
              Log to Sheets
            </div>
            <div className="text-xs text-gray-500">
              Google Sheets Logger
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Stores query/response pairs for audit trail
        </div>
      </div>
    </EventNode>
  );
};
