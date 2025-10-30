import { ApiNode, ApiNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪝</span>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-gray-700">GitHub Webhook</div>
            <div className="text-xs text-gray-500 font-mono">POST /github-commit-jenkins</div>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1">{props.data.description}</div>
      </div>
    </ApiNode>
  );
};

