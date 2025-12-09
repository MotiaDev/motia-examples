/**
 * UI Component for the Code Refiner Agent Step
 */

import { EventNode, type EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-start gap-3 p-2">
        <div className="text-3xl">🔧</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-600/30 text-amber-300 rounded text-xs font-medium">
              Code Refiner
            </span>
            <span className="px-2 py-0.5 bg-orange-600/30 text-orange-300 rounded text-xs">
              Claude
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Analyzes test failures and fixes code to pass all tests.
          </p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-red-400">🐛 Debug</span>
            <span className="text-green-400">🔄 Iterate</span>
            <span className="text-blue-400">✨ Fix</span>
          </div>
        </div>
      </div>
    </EventNode>
  );
};

