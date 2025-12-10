import React, { useState } from 'react';
import { BaseHandle, Position } from '../node_modules/motia/dist/esm/workbench';

export default function HumanReview() {
  const [reviewStatus, setReviewStatus] = useState('pending');
  const [feedback, setFeedback] = useState('');

  const handleApprove = () => {
    fetch('/api/review/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'approved',
        feedback,
        timestamp: new Date().toISOString()
      })
    });
    setReviewStatus('approved');
  };

  const handleReject = () => {
    fetch('/api/review/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'rejected',
        feedback,
        timestamp: new Date().toISOString()
      })
    });
    setReviewStatus('rejected');
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 text-white">
      <div className="text-sm font-medium mb-2">Human Review</div>
      <div className="text-xs text-gray-300 mb-3">Review research analysis</div>
      
      <div className="mb-3">
        <textarea 
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
          rows={3}
          placeholder="Enter feedback..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={handleApprove}
          className="px-3 py-1 bg-green-600 rounded text-sm"
          disabled={reviewStatus === 'approved'}
        >
          Approve
        </button>
        <button 
          onClick={handleReject}
          className="px-3 py-1 bg-red-600 rounded text-sm"
          disabled={reviewStatus === 'rejected'}
        >
          Request Changes
        </button>
      </div>
      
      {reviewStatus !== 'pending' && (
        <div className="mt-2 text-xs">
          Status: <span className={reviewStatus === 'approved' ? 'text-green-400' : 'text-red-400'}>
            {reviewStatus === 'approved' ? 'Approved' : 'Changes Requested'}
          </span>
        </div>
      )}
      
      <BaseHandle type="target" position={Position.Top} />
      <BaseHandle type="source" position={Position.Bottom} />
    </div>
  );
} 