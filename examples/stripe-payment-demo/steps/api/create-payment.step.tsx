import { ApiNode, ApiNodeProps } from 'motia/workbench';
import React from 'react';

export const Node: React.FC<ApiNodeProps> = (props) => {
  return (
    <ApiNode {...props}>
      <div className="flex flex-col gap-3">
        {/* Header with icon */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Create Payment</div>
            <div className="text-xs text-gray-500">Initialize Stripe payment</div>
          </div>
        </div>

        {/* Request example */}
        <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
          <div className="text-xs font-mono text-gray-600 mb-1">Request</div>
          <div className="text-xs font-mono text-gray-800">
            <span className="text-blue-600">POST</span> /payments
          </div>
          <div className="text-xs font-mono text-gray-700 mt-1">
            {'{ amount, currency }'}
          </div>
        </div>

        {/* Response example */}
        <div className="bg-green-50 rounded-md p-2 border border-green-200">
          <div className="text-xs font-mono text-gray-600 mb-1">Response</div>
          <div className="text-xs font-mono text-green-800">
            {'{ paymentIntentId, clientSecret }'}
          </div>
        </div>

        {/* Powered by Stripe badge */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
          </svg>
          <span>Powered by Stripe</span>
        </div>
      </div>
    </ApiNode>
  );
};

