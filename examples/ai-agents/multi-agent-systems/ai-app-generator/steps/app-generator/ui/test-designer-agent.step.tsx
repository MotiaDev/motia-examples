/**
 * UI Component for the Test Designer Agent Step
 */

import { EventNode, type EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-start gap-3 p-2">
        <div className="text-3xl">📝</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-300 rounded text-xs font-medium">
              Test Designer
            </span>
            <span className="px-2 py-0.5 bg-orange-600/30 text-orange-300 rounded text-xs">
              Claude
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Creates comprehensive test cases covering happy paths and edge cases.
          </p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-green-400">✅ Unit Tests</span>
            <span className="text-yellow-400">🔗 Integration</span>
            <span className="text-red-400">⚠️ Edge Cases</span>
          </div>
        </div>
      </div>
    </EventNode>
  );
};

