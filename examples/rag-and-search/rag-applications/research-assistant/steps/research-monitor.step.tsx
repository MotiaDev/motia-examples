import React from 'react';
import { BaseHandle, Position, EventNodeProps } from '../node_modules/motia/dist/esm/workbench';

export default function ResearchMonitor(_: EventNodeProps) {
  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 text-white">
      <div className="text-sm font-medium mb-2">Research Paper Monitor</div>
      <div className="text-xs text-gray-300 mb-3">Tracks analysis progress</div>
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
          <span className="text-xs">Paper Analysis</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
          <span className="text-xs">Summary</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
          <span className="text-xs">Research Gaps</span>
        </div>
      </div>
      
      <BaseHandle type="target" position={Position.Top} />
      <BaseHandle type="source" position={Position.Bottom} />
    </div>
  );
} 