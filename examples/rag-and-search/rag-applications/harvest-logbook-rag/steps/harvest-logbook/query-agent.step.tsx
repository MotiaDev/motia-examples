/**
 * UI Step for Query Agent
 * Custom visualization for AI agent processing
 */

import { EventNode, EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-gray-700">
              AI Agent Query
            </div>
            <div className="text-xs text-gray-500">
              RAG: Pinecone + HuggingFace LLM
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Context retrieval with conversational memory
        </div>
      </div>
    </EventNode>
  );
};
