/**
 * UI Component for the Assembly Agent Step
 */

import { EventNode, type EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-start gap-3 p-2">
        <div className="text-3xl">📦</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-emerald-600/30 text-emerald-300 rounded text-xs font-medium">
              Assembly
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Bundles all code into a deployable application with configs.
          </p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-blue-400">📋 package.json</span>
            <span className="text-cyan-400">🐳 Dockerfile</span>
            <span className="text-green-400">📖 README</span>
          </div>
        </div>
      </div>
    </EventNode>
  );
};

