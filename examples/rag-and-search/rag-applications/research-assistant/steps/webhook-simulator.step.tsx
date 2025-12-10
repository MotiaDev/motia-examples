import React from 'react';
import { BaseHandle, Position } from '../node_modules/motia/dist/esm/workbench';

export default function WebhookSimulator() {
  const simulateUpload = () => {
    fetch('/api/webhook/paper-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        event: 'paper-uploaded',
        timestamp: new Date().toISOString(),
        paperData: {
          title: 'Sample Research Paper',
          authors: ['Sample Author'],
          abstract: 'This is a sample paper abstract for testing.'
        }
      }),
    });
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 text-white">
      <div className="text-sm font-medium mb-2">Paper Upload Webhook</div>
      <div className="text-xs text-gray-300 mb-3">Simulate paper uploads</div>
      
      <button 
        onClick={simulateUpload}
        className="px-3 py-1 bg-blue-600 rounded text-sm"
      >
        Simulate Upload
      </button>
      
      <BaseHandle type="source" position={Position.Bottom} />
    </div>
  );
} 