import React from 'react'
import { BaseHandle, Position } from '@motiadev/workbench'

export default function TestPRWebhook() {
  const sendWebhook = (action: 'opened' | 'edited' | 'closed', merged: boolean = false) => {
    const prNumber = Math.floor(Math.random() * 1000)
    
    fetch('/api/github/pr-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        pull_request: {
          number: prNumber,
          title: `Test PR #${prNumber}`,
          body: `This is a test PR for action: ${action}`,
          state: action === 'closed' ? 'closed' : 'open',
          merged: merged,
          labels: [],
          user: {
            login: 'test-author'
          },
          base: {
            ref: 'main',
            repo: {
              name: 'test-repo',
              owner: {
                login: 'test-owner'
              }
            }
          },
          head: {
            ref: `feature/test-branch-${prNumber}`,
            sha: `test-commit-sha-${prNumber}`
          }
        }
      }),
    })
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 text-white">
      <div className="text-sm font-medium mb-2">GitHub PR Simulator</div>
      <div className="flex flex-col space-y-2">
        <button 
          onClick={() => sendWebhook('opened')}
          className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700 transition-colors"
        >
          Create PR
        </button>
        
        <button 
          onClick={() => sendWebhook('edited')}
          className="px-3 py-1 bg-yellow-600 rounded text-sm hover:bg-yellow-700 transition-colors"
        >
          Update PR
        </button>
        
        <button 
          onClick={() => sendWebhook('closed', false)}
          className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700 transition-colors"
        >
          Close PR
        </button>

        <button 
          onClick={() => sendWebhook('closed', true)}
          className="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-700 transition-colors"
        >
          Merge PR
        </button>

        <div className="text-xs text-gray-400 mt-2">
          Simulates PR events with complete metadata
        </div>
      </div>
      <BaseHandle type="source" position={Position.Bottom} />
    </div>
  )
} 