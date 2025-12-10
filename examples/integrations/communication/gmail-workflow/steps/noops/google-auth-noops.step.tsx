import { ApiNode, ApiNodeProps} from '@motiadev/workbench'
import { Button } from '@motiadev/ui'
import React, { useEffect, useRef, useState } from 'react'

interface TokenStatus {
  expiryDate: Date | null
  isExpired: boolean
}

interface AuthUrlResponse {
  authUrl: string
}

export const Node: React.FC<ApiNodeProps> = ({ data }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchTokenStatus = async (): Promise<void> => {
    try {
      const res = await fetch('/api/token-status')
      
      if (!res.ok) {
        throw new Error(`Failed to fetch token status: ${res.status} ${res.statusText}`)
      }
      
      const response = await res.json()
      setTokenStatus({
        ...response,
        expiryDate: response.expiryDate ? new Date(response.expiryDate) : null
      })
      
      // Clear any previous errors when successful
      setErrorMessage(null)
    } catch (error) {
      console.error('Token status error:', error)
      setErrorMessage('Failed to fetch token status')
    }
  }

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    // Fetch immediately on mount
    fetchTokenStatus()
    
    // Refresh token status every 20 minutes
    intervalRef.current = setInterval(fetchTokenStatus, 1000 * 60 * 20)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const handleAuthRequest = async (): Promise<void> => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      
      const res = await fetch('/api/get-auth-url')
      
      if (!res.ok) {
        throw new Error(`Failed to get auth URL: ${res.status} ${res.statusText}`)
      }
      
      const { authUrl } = await res.json() as AuthUrlResponse
      
      if (!authUrl) {
        throw new Error('No authentication URL received')
      }
      
      window.open(authUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Authentication error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to authenticate with Google')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWatchEmails = async (): Promise<void> => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      
      const res = await fetch('/api/watch')
      
      if (!res.ok) {
        throw new Error(`Failed to start watching: ${res.status} ${res.statusText}`)
      }
      
      // Refresh token status after watching
      await fetchTokenStatus()
    } catch (error) {
      console.error('Watch emails error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start watching emails')
    } finally {
      setIsLoading(false)
    }
  }

  const getTokenStatusClass = (): string => {
    if (!tokenStatus) return 'text-gray-500'
    return tokenStatus.isExpired ? 'text-red-500 font-bold' : 'text-green-500 font-bold'
  }
  
  return (
    <ApiNode data={{
      ...data,
      name: 'Google Auth Status',
      description: 'Manage Gmail authentication and watching'
    }}>
      <div className='flex gap-2 flex-col p-2'>
        {/* Status Information */}
        <div className='mb-2 p-2 border rounded bg-gray-50 dark:bg-gray-800'>
          <h3 className='text-sm font-semibold mb-1'>Token Status</h3>
          
          {tokenStatus ? (
            <>
              <p className={getTokenStatusClass()}>
                {tokenStatus.isExpired ? '❌ Expired' : '✅ Active'}
              </p>
              {tokenStatus.expiryDate && (
                <p className='text-xs'>
                  Expires: {tokenStatus.expiryDate.toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              )}
            </>
          ) : (
            <p className='text-gray-500 text-sm'>Loading status...</p>
          )}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className='mb-2 p-2 bg-red-100 text-red-800 rounded text-sm' role="alert">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className='flex gap-2 flex-col'>
          <Button 
            disabled={isLoading} 
            onClick={handleAuthRequest}
            aria-label="Login with Google"
          >
            {isLoading ? 'Authenticating...' : '🔑 Login with Google'}
          </Button>
          <Button 
            disabled={isLoading || (tokenStatus?.isExpired ?? true)} 
            onClick={handleWatchEmails}
            aria-label="Watch Emails"
          >
            {isLoading ? 'Starting...' : '👁️ Watch Emails'}
          </Button>
        </div>
        
        {/* Help Text */}
        <p className='text-xs text-gray-500 mt-2'>
          First authenticate with Google, then click "Watch Emails" to begin monitoring
        </p>
      </div>
    </ApiNode>
  )
}
