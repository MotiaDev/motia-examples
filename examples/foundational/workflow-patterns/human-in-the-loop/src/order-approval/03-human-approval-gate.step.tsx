import { NoopNode, NoopNodeProps } from 'motia/workbench'
import React from 'react'

/**
 * Custom UI for the approval gate showing red/green buttons
 * This visually represents the pause point where external systems
 * call the webhook to continue the workflow
 */

export const Node: React.FC<NoopNodeProps> = (props) => {
  return (
    <NoopNode {...props}>
      <div className="flex flex-col gap-3 p-3">
        {/* Pause indicator */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">⏸️</span>
          <div className="text-sm font-bold text-white">Workflow Paused</div>
        </div>
        
        <div className="text-xs text-gray-300">
          Awaiting human approval decision
        </div>

        {/* Decision buttons visualization */}
        <div className="flex gap-2 mt-2">
          <div 
            className="flex-1 rounded px-3 py-2 text-center"
            style={{ 
              backgroundColor: '#16a34a',
              border: '1px solid #22c55e'
            }}
          >
            <div className="text-xs font-semibold text-white">✓ Approve</div>
          </div>
          <div 
            className="flex-1 rounded px-3 py-2 text-center"
            style={{ 
              backgroundColor: '#dc2626',
              border: '1px solid #ef4444'
            }}
          >
            <div className="text-xs font-semibold text-white">✗ Reject</div>
          </div>
        </div>

        {/* Webhook endpoint info */}
        <div className="mt-2 p-2 bg-gray-700 rounded">
          <div className="text-[10px] text-gray-400 mb-1">External System Calls:</div>
          <div className="text-xs font-mono text-green-400">
            POST /webhooks/orders/:id/approve
          </div>
        </div>

        <div className="text-[10px] text-gray-400 italic">
          Click → API → State Update → Flow Resumes
        </div>
      </div>
    </NoopNode>
  )
}

