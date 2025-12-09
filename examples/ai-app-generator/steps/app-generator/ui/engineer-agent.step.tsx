/**
 * UI Component for the Engineer Agent Step
 * 
 * Displays code generation progress and file outputs.
 */

import { EventNode, type EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-start gap-3 p-2">
        <div className="text-3xl">👨‍💻</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded text-xs font-medium">
              Engineer
            </span>
            <span className="px-2 py-0.5 bg-orange-600/30 text-orange-300 rounded text-xs">
              Claude
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Generates complete, production-ready React/TypeScript code for each component.
          </p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-blue-400">⚛️ React</span>
            <span className="text-cyan-400">📘 TypeScript</span>
            <span className="text-teal-400">🎨 Tailwind</span>
          </div>
        </div>
      </div>
    </EventNode>
  );
};

