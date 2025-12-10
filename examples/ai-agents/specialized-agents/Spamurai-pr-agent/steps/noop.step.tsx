import React from 'react'
import { BaseHandle, Position } from 'motia/workbench'

// React component for testing Spamurai workflow via UI
export default function TestSpamuraiPR() {
    // functin to simulation webhook payloads
    const sendWebhook = (action: 'opened' | 'edited') => {
        const prNumber = Math.floor(Math.random() * 10000)
        const testRepo = 'test-repo'
        const testOwner = 'test-owner'

        // send simulated payload to endpoing
        fetch('/webhooks/github', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action,
                pull_request: {
                    number: prNumber,
                    title: `Fake PR ${prNumber}`,
                    body: `This is a simulated PR with action: ${action}`,
                    state: 'open',
                    labels: [],
                    user: { login: 'fake-user' },
                    base: {
                        ref: 'main',
                        repo: {
                            name: testRepo,
                            owner: { login: testOwner },
                        },
                    },
                    head: {
                        ref: `test-branch-${prNumber}`,
                        sha: `fake-sha-${prNumber}`,
                    },
                    html_url: `https://github.com/${testOwner}/${testRepo}/pull/${prNumber}`,
                    diff_url: `https://patch-diff.githubusercontent.com/raw/${testOwner}/${testRepo}/pull/${prNumber}.diff`,
                },
                repository: {
                    name: testRepo,
                    owner: { login: testOwner },
                },
                installation: {
                    id: 12345678,
                },
            }),
        })
    }

    return (
        <div className="p-4 bg-gray-900 text-white rounded-lg border border-gray-700">
            <div className="text-sm font-semibold mb-2">Spamurai PR Simulator</div>
            <div className="flex flex-col space-y-2">
                <button
                    onClick={() => sendWebhook('opened')}
                    className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700"
                >
                    Simulate PR Opened
                </button>
                <button
                    onClick={() => sendWebhook('edited')}
                    className="px-3 py-1 bg-yellow-600 rounded text-sm hover:bg-yellow-700"
                >
                    Simulate PR Edited
                </button>
                <div className="text-xs text-gray-400 mt-2">Simulates PRs with installation ID + diff URL</div>
            </div>
            <BaseHandle type="source" position={Position.Bottom} />
        </div>
    )
}