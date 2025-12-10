import { ApiNodeProps, BaseHandle, Position } from "@motiadev/workbench";
import React, { useState } from 'react';

interface Email {
  id: string
  from: string
  subject: string
  category?: string
  urgency?: string
  isSpam?: boolean
}

export const Node: React.FC<ApiNodeProps> = () => {
  const [pendingEmails, setPendingEmails] = useState<Email[]>([
    {
      id: 'sample-email-1',
      from: 'suspicious@example.com',
      subject: 'Urgent: Your account needs attention',
      category: 'potential-spam',
      urgency: 'high',
      isSpam: true
    },
    {
      id: 'sample-email-2',
      from: 'colleague@company.com',
      subject: 'Question about project timeline',
      category: 'work',
      urgency: 'medium',
      isSpam: false
    }
  ])
  const [reviewedCount, setReviewedCount] = useState(0)

  // Simulate reviewing an email
  const handleReviewEmail = (email: Email, isSpam: boolean) => {
    // In a real implementation, this would trigger an API call or emit an event
    console.log(`Email ${email.id} marked as ${isSpam ? 'spam' : 'not spam'}`)

    // Remove from pending list
    setPendingEmails(pendingEmails.filter(e => e.id !== email.id))

    // Increment reviewed count
    setReviewedCount(prev => prev + 1)
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 text-white w-[350px]">
      <div className="text-sm font-medium mb-3 flex items-center justify-between">
        <span>Human Email Review</span>
        <span className="bg-blue-600 text-xs px-2 py-1 rounded-full">
          {pendingEmails.length} Pending
        </span>
      </div>

      <div className="max-h-[200px] overflow-y-auto">
        {pendingEmails.length > 0 ? (
          pendingEmails.map(email => (
            <div key={email.id} className="mb-3 p-2 bg-gray-700 rounded border border-gray-600">
              <div className="text-xs text-gray-300">From: {email.from}</div>
              <div className="text-sm font-medium mb-1">{email.subject}</div>
              <div className="flex items-center text-xs mt-1">
                <span className={`px-2 py-0.5 rounded mr-2 ${
                  email.category === 'potential-spam'
                    ? 'bg-red-800 text-red-200'
                    : 'bg-blue-800 text-blue-200'
                }`}>
                  {email.category}
                </span>
                <span className="px-2 py-0.5 rounded bg-gray-600">
                  {email.urgency} urgency
                </span>
              </div>
              <div className="flex justify-between mt-2">
                <button
                  onClick={() => handleReviewEmail(email, false)}
                  className="px-2 py-1 bg-green-700 hover:bg-green-600 text-xs rounded"
                >
                  Not Spam
                </button>
                <button
                  onClick={() => handleReviewEmail(email, true)}
                  className="px-2 py-1 bg-red-700 hover:bg-red-600 text-xs rounded"
                >
                  Mark as Spam
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 text-sm py-3">
            No emails pending review
          </div>
        )}
      </div>

      {reviewedCount > 0 && (
        <div className="mt-3 text-center text-xs text-gray-400">
          {reviewedCount} emails reviewed in this session
        </div>
      )}

      <BaseHandle type="target" position={Position.Top}/>
      <BaseHandle type="source" position={Position.Bottom}/>
    </div>
  )
} 