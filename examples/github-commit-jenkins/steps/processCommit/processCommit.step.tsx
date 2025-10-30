import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✂️</span>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-gray-700">Text Splitter & Embeddings</div>
            <div className="text-xs text-gray-500">Chunk: 400 chars, Overlap: 40</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm">🤖</span>
          <div className="text-xs text-gray-400">OpenAI text-embedding-3-small</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">💾</span>
          <div className="text-xs text-gray-400">Supabase Vector Store</div>
        </div>
      </div>
    </EventNode>
  );
};

