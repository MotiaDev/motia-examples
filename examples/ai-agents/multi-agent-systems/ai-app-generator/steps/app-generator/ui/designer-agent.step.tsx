/**
 * UI Component for the Designer Agent Step
 */

import { EventNode, type EventNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<EventNodeProps> = (props) => {
  return (
    <EventNode {...props}>
      <div className="flex items-start gap-3 p-2">
        <div className="text-3xl">🎨</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-pink-600/30 text-pink-300 rounded text-xs font-medium">
              Designer
            </span>
            <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded text-xs">
              Gemini
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Enhances UI/UX with color schemes, typography, and layout suggestions.
          </p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-pink-400">🎨 Colors</span>
            <span className="text-purple-400">✍️ Typography</span>
            <span className="text-cyan-400">📐 Layout</span>
          </div>
        </div>
      </div>
    </EventNode>
  );
};

