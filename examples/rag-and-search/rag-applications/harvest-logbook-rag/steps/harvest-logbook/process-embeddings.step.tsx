/**
 * UI Step for Process Embeddings
 * Custom visualization for embedding processing
 */

import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧬</span>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-gray-700">
              Process Embeddings
            </div>
            <div className="text-xs text-gray-500">
              Text Splitting → OpenAI → Pinecone
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Chunk size: 400 | Overlap: 40
        </div>
      </div>
    </EventNode>
  );
};
