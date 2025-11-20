import { ApiNode, ApiNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-3">
        {/* Header with animated icon */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Stripe Webhook</div>
            <div className="text-xs text-gray-500">Real-time payment updates</div>
          </div>
        </div>

        {/* Webhook info */}
        <div className="bg-purple-50 rounded-md p-2 border border-purple-200">
          <div className="text-xs font-mono text-purple-900 mb-2">
            <span className="text-purple-600">POST</span> /webhooks/stripe
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">payment_intent.succeeded</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-700">payment_intent.payment_failed</span>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>Signature verified</span>
        </div>
      </div>
    </ApiNode>
  );
};

