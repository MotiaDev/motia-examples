import { ApiNode, ApiNodeProps } from '@motiadev/workbench'
import { Button } from '@motiadev/ui'
import React, { useState } from 'react'

export const Node: React.FC<ApiNodeProps> = ({ data }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' })

  const simulateEvent = async () => {
    // Reset previous status
    setStatus({ type: null, message: '' })
    setIsLoading(true)

    const lastMessage = {
      "message": {
        "data": "eyJlbWFpbEFkZHJlc3MiOiJhbmRlcnNvbm9mbEBnbWFpbC5jb20iLCJoaXN0b3J5SWQiOjI4NTUyNjgyfQ==",
        "messageId": "13594882889976308"
      }
    }

    try {
      const response = await fetch('/api/gmail-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(lastMessage)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      setStatus({
        type: 'success',
        message: 'Webhook simulation successful'
      })
    } catch (error) {
      console.error('Error simulating event:', error)
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to simulate webhook'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ApiNode data={data}>
      <div className="flex flex-col gap-3 p-2 w-full">
        <div className="flex flex-col items-center gap-2 mt-1">
          <Button 
            onClick={simulateEvent} 
            disabled={isLoading}
            className={isLoading ? 'opacity-70 cursor-not-allowed' : ''}
          >
            {isLoading ? 'Sending...' : 'Simulate Email Webhook'}
          </Button>
          
          {status.type && (
            <div className={`text-sm mt-2 px-3 py-1 rounded ${
              status.type === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
            }`}>
              {status.message}
            </div>
          )}
        </div>
      </div>
    </ApiNode>
  )
}
