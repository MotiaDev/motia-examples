import React from 'react'
import { BaseHandle, Position } from 'motia/workbench'

export default function TestGithubIssue() {
  const sendWebhook = (action: 'opened' | 'edited' | 'closed') => {
    const issueNumber = Math.floor(Math.random() * 1000)

    fetch('/api/github/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        issue: {
          number: issueNumber,
          title: `Test Issue #${issueNumber}`,
          body: `This is a test issue for action: ${action}`,
          state: action === 'closed' ? 'closed' : 'open',
          labels: [],
        },
        repository: {
          owner: { login: 'test-owner' },
          name: 'test-repo',
        },
      }),
    })
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 text-white">
      <div className="text-sm font-medium mb-2">GitHub Issue Simulator</div>
      <div className="space-y-2">
        <button
          onClick={() => sendWebhook('opened')}
          className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          Create Issue
        </button>

        <button
          onClick={() => sendWebhook('edited')}
          className="px-3 py-1 bg-yellow-600 rounded text-sm hover:bg-yellow-700 transition-colors"
        >
          Edit Issue
        </button>

        <button
          onClick={() => sendWebhook('closed')}
          className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700 transition-colors"
        >
          Close Issue
        </button>
      </div>
      <BaseHandle type="source" position={Position.Bottom} />
    </div>
  )
}
