import React, { useState } from 'react'

interface JobStatus {
  status: string
  videoUrl?: string
  error?: string
}

export const GitHubStarsUI: React.FC = () => {
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setJobId(null)
    setJobStatus(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/github/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, theme }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setJobId(data.jobId)
        setJobStatus({ status: 'initiated' })
        pollJobStatus(data.jobId)
      } else {
        setError(data.error || 'Failed to initiate video generation.')
      }
    } catch (err: any) {
      setError(err.message || 'Network error or unexpected response.')
    } finally {
      setIsLoading(false)
    }
  }

  const pollJobStatus = async (currentJobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/github/jobs/${currentJobId}`)
        const data = await response.json()
        
        if (response.ok) {
          setJobStatus(data)
          
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(interval)
          }
        } else {
          setError(data.error || 'Failed to fetch job status.')
          clearInterval(interval)
        }
      } catch (err: any) {
        setError(err.message || 'Network error while polling job status.')
        clearInterval(interval)
      }
    }, 3000) // Poll every 3 seconds
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
    switch (status) {
      case 'completed':
        return <span className={`${baseClasses} bg-green-500/20 text-green-300 border border-green-500/30`}>✅ Completed</span>
      case 'processing':
        return <span className={`${baseClasses} bg-blue-500/20 text-blue-300 border border-blue-500/30`}>⏳ Processing Stars...</span>
      case 'rendering':
        return <span className={`${baseClasses} bg-purple-500/20 text-purple-300 border border-purple-500/30`}>🎬 Rendering Video...</span>
      case 'failed':
        return <span className={`${baseClasses} bg-red-500/20 text-red-300 border border-red-500/30`}>❌ Failed</span>
      default:
        return <span className={`${baseClasses} bg-gray-500/20 text-gray-300 border border-gray-500/30`}>{status}</span>
    }
  }

  return (
    <div className="h-full w-full p-6 overflow-auto bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-4xl">⭐</span>
          <h1 className="text-3xl font-bold">GitHub Stars Video Generator</h1>
        </div>

        <p className="text-gray-400">
          Generate an animated video of your GitHub repository's star history using Remotion.
        </p>

        {/* Input Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="owner" className="block text-sm font-medium mb-2 text-gray-300">
                  Repository Owner
                </label>
                <input
                  id="owner"
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="facebook"
                  required
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="repo" className="block text-sm font-medium mb-2 text-gray-300">
                  Repository Name
                </label>
                <input
                  id="repo"
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="react"
                  required
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-md p-4">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Video Theme
              </label>
              <div className="flex gap-3">
                {/* Dark Mode Button */}
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    theme === 'dark'
                      ? 'bg-blue-600 text-white border-2 border-blue-500 shadow-lg shadow-blue-500/20'
                      : 'bg-zinc-700 text-gray-400 border-2 border-zinc-600 hover:border-zinc-500'
                  }`}
                >
                  <span className="text-xl">🌙</span>
                  <span>Dark</span>
                  {theme === 'dark' && <span className="text-xs">✓</span>}
                </button>

                {/* Light Mode Button */}
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    theme === 'light'
                      ? 'bg-yellow-500 text-gray-900 border-2 border-yellow-400 shadow-lg shadow-yellow-500/20'
                      : 'bg-zinc-700 text-gray-400 border-2 border-zinc-600 hover:border-zinc-500'
                  }`}
                >
                  <span className="text-xl">☀️</span>
                  <span>Light</span>
                  {theme === 'light' && <span className="text-xs">✓</span>}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {theme === 'dark' ? 'Dark background with white text' : 'Light background with black text'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  ⭐ Generate Video
                </>
              )}
            </button>
          </form>
        </div>

        {/* Job Status */}
        {jobId && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Job Status</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-gray-400">Job ID:</p>
                  <code className="text-sm bg-zinc-800 px-2 py-1 rounded text-blue-400 font-mono">{jobId}</code>
                  {jobStatus && getStatusBadge(jobStatus.status)}
                </div>
              </div>

              {jobStatus?.status === 'processing' && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fetching GitHub star history...
                </div>
              )}

              {jobStatus?.status === 'rendering' && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Rendering video with Remotion... This may take a few minutes.
                </div>
              )}

              {jobStatus?.status === 'completed' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-400">
                    <span>⭐</span>
                    <p className="font-semibold">Video is ready!</p>
                  </div>
                  
                  {/* Debug Info */}
                  <div className="text-xs text-gray-500 font-mono bg-zinc-800 p-2 rounded">
                    <div>videoUrl: {jobStatus.videoUrl || 'undefined'}</div>
                    <div>All fields: {Object.keys(jobStatus).join(', ')}</div>
                  </div>
                  
                  {/* Video Preview */}
                  {jobStatus.videoUrl ? (
                    <>
                      <div className="bg-black rounded-lg overflow-hidden border border-zinc-700">
                        <video 
                          key={jobStatus.videoUrl}
                          controls 
                          autoPlay 
                          loop
                          muted
                          playsInline
                          className="w-full"
                          style={{ maxHeight: '400px' }}
                          src={jobStatus.videoUrl}
                        >
                          <source src={jobStatus.videoUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                      
                      <a
                        href={jobStatus.videoUrl}
                        download
                        className="block w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors text-center"
                      >
                        📥 Download Video (MP4)
                      </a>
                    </>
                  ) : (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                      <p className="text-sm text-yellow-400">
                        ⚠️ Video completed but URL is missing. Check job status API response.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {jobStatus?.status === 'failed' && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                  <p className="text-sm text-red-400">
                    {jobStatus.error || 'Video generation failed'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">
            💡 <strong className="text-white">Tip:</strong> This will fetch your repository's star history and generate
            a beautiful video visualization using Remotion. The process may take a few moments
            depending on the number of stars.
          </p>
        </div>
      </div>
    </div>
  )
}

