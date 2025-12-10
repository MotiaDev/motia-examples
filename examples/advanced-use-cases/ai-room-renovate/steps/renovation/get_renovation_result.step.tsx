/**
 * UI Override for Get Renovation Result API Step
 */

import { ApiNode, ApiNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex items-start gap-3 p-3">
        <div className="text-3xl">📋</div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">Get Results</h4>
          <p className="text-xs text-gray-500 mt-1">
            Retrieve your complete renovation plan and roadmap
          </p>
          <div className="text-xs text-gray-400 font-mono mt-2">
            GET /renovation/:sessionId/result
          </div>
        </div>
      </div>
    </ApiNode>
  );
};

