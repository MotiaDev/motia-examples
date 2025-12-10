/**
 * UI Override for Project Coordinator Event Step
 */

import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-start gap-3 p-3">
        <div className="text-3xl">🏗️</div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">Project Coordinator</h4>
          <p className="text-xs text-gray-500 mt-1">
            Generates comprehensive roadmap with budget, contractors, and rendering prompts
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Budget Breakdown</span>
            <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">Contractors</span>
            <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded">Checklist</span>
          </div>
        </div>
      </div>
    </EventNode>
  );
};

