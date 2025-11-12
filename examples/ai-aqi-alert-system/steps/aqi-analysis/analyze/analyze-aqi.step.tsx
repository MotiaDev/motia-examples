import { ApiNode, ApiNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌍</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-blue-600">AQI Analysis</span>
            <span className="text-xs text-gray-500">Real-time air quality monitoring</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="px-2 py-1 bg-blue-50 rounded text-xs text-blue-700 font-medium">
            POST /aqi/analyze
          </div>
        </div>
        
        <div className="text-xs text-gray-600 mt-1">
          <div className="flex items-center gap-1">
            <span>📍</span>
            <span>Location-based AQI data</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🏥</span>
            <span>Health recommendations</span>
          </div>
          <div className="flex items-center gap-1">
            <span>📈</span>
            <span>Trend analysis (optional)</span>
          </div>
        </div>
      </div>
    </ApiNode>
  );
};

