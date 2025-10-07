/**
 * UI Step for Query Only
 * Custom visualization for query-only endpoint
 */

import { ApiNode, ApiNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-gray-700">
              Query Knowledge Base
            </div>
            <div className="text-xs text-gray-500">
              POST /harvest_logbook/query
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Query without storing new data
        </div>
      </div>
    </ApiNode>
  );
};
