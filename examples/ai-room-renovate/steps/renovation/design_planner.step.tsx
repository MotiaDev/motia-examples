/**
 * UI Override for Design Planner Event Step
 */

import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-start gap-3 p-3">
        <div className="text-3xl">🎨</div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">Design Planner</h4>
          <p className="text-xs text-gray-500 mt-1">
            Creates detailed design plans with materials, colors, and specifications
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded">Materials</span>
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">Colors</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">Timeline</span>
          </div>
        </div>
      </div>
    </EventNode>
  );
};

