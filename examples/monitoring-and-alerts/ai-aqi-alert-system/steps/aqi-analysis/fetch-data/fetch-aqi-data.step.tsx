import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-purple-600">Fetch AQI Data</span>
            <span className="text-xs text-gray-500">Web scraping with Firecrawl</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-gray-600 font-medium">Data Points:</span>
            <div className="flex flex-wrap gap-1">
              <span className="px-1.5 py-0.5 bg-purple-50 rounded text-purple-700">AQI</span>
              <span className="px-1.5 py-0.5 bg-purple-50 rounded text-purple-700">PM2.5</span>
              <span className="px-1.5 py-0.5 bg-purple-50 rounded text-purple-700">PM10</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-600 font-medium">Weather:</span>
            <div className="flex flex-wrap gap-1">
              <span className="px-1.5 py-0.5 bg-blue-50 rounded text-blue-700">Temp</span>
              <span className="px-1.5 py-0.5 bg-blue-50 rounded text-blue-700">Humidity</span>
              <span className="px-1.5 py-0.5 bg-blue-50 rounded text-blue-700">Wind</span>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mt-1 italic">
          Powered by Firecrawl API
        </div>
      </div>
    </EventNode>
  );
};

