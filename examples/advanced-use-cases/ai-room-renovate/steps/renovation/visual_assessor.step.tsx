/**
 * UI Override for Visual Assessor Event Step
 */

import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-start gap-3 p-3">
        <div className="text-3xl">🔍</div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">Visual Assessor</h4>
          <p className="text-xs text-gray-500 mt-1">
            Analyzes room details, extracts requirements, and identifies opportunities
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Room Analysis</span>
            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">Budget Check</span>
            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">Style Detection</span>
          </div>
        </div>
      </div>
    </EventNode>
  );
};

