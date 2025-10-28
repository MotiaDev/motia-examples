import { ApiNode, ApiNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-blue-600">
          📝 Public Form Webhook
        </div>
        <div className="text-xs text-gray-500 font-mono">
          POST {props.data.path}
        </div>
        <div className="text-xs text-gray-400">
          {props.data.description}
        </div>
      </div>
    </ApiNode>
  );
};

