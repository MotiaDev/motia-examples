/**
 * UI Component for the Project Manager Agent Step
 */

import { CronNode, type CronNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<CronNodeProps> = (props) => {
  return (
    <CronNode {...props}>
      <div className="flex items-start gap-3 p-2">
        <div className="text-3xl">📊</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-rose-600/30 text-rose-300 rounded text-xs font-medium">
              Project Manager
            </span>
            <span className="px-2 py-0.5 bg-gray-600/30 text-gray-300 rounded text-xs">
              Cron: */2
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Monitors progress, flags risks, and coordinates milestones.
          </p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-yellow-400">⚠️ Risks</span>
            <span className="text-green-400">🎯 Milestones</span>
            <span className="text-blue-400">💰 Cost</span>
          </div>
        </div>
      </div>
    </CronNode>
  );
};

