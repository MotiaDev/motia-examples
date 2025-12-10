/**
 * UI Component for the Architect Agent Step
 * 
 * Displays agent status, design document preview, and metrics.
 */

import { EventNode, type EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-start gap-3 p-2">
        <div className="text-3xl">🏗️</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded text-xs font-medium">
              Architect
            </span>
            <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded text-xs">
              Gemini
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Analyzes requirements and designs system architecture, file layout, and component structure.
          </p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-emerald-400">📐 Design Patterns</span>
            <span className="text-cyan-400">📁 File Layout</span>
            <span className="text-amber-400">🧩 Components</span>
          </div>
        </div>
      </div>
    </EventNode>
  );
};

