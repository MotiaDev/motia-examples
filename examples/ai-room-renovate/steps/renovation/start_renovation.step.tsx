/**
 * UI Override for Start Renovation API Step
 * Displays a beautiful card in Motia Workbench
 */

import { ApiNode, ApiNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">🏚️</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">AI Home Renovation Planner</h3>
            <p className="text-sm text-gray-500">Start your renovation journey</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <span>📸</span>
            <span>Analyzes rooms</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span>🎨</span>
            <span>Creates designs</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span>💰</span>
            <span>Estimates budgets</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span>📊</span>
            <span>Plans timeline</span>
          </div>
        </div>

        <div className="text-xs text-gray-400 font-mono mt-2">
          POST /renovation/start
        </div>
      </div>
    </ApiNode>
  );
};

