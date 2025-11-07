/**
 * UI Override for Info Handler Event Step
 */

import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-start gap-3 p-3">
        <div className="text-3xl">💬</div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">Info Handler</h4>
          <p className="text-xs text-gray-500 mt-1">
            Answers general questions about costs, timelines, and capabilities
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded">Help</span>
            <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded">Guidance</span>
          </div>
        </div>
      </div>
    </EventNode>
  );
};

