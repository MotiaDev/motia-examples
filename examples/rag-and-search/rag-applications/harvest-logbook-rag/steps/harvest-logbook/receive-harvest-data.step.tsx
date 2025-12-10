/**
 * UI Step for Receive Harvest Data
 * Custom visualization for the webhook entry point
 */

import { ApiNode, ApiNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌾</span>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-gray-700">
              Harvest Logbook Entry
            </div>
            <div className="text-xs text-gray-500">
              POST /harvest_logbook
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Receives harvest data and triggers RAG pipeline
        </div>
      </div>
    </ApiNode>
  );
};
