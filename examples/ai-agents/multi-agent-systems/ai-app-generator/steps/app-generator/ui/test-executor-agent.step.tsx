/**
 * UI Component for the Test Executor Agent Step
 */

import { EventNode, type EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-start gap-3 p-2">
        <div className="text-3xl">🧪</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-green-600/30 text-green-300 rounded text-xs font-medium">
              Test Executor
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Runs test suites and generates detailed pass/fail reports.
          </p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-green-400">✓ Pass</span>
            <span className="text-red-400">✗ Fail</span>
            <span className="text-blue-400">📊 Report</span>
          </div>
        </div>
      </div>
    </EventNode>
  );
};

