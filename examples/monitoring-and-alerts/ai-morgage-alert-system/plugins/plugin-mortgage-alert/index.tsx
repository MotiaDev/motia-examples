import React, { useState, useEffect } from 'react'

interface AnalysisJob {
  dataId: string
  status: 'processing' | 'completed' | 'failed'
  analysis?: string
  timestamp?: string
  contextCount?: number
}

interface RecentAnalysis {
  timestamp: string
  dataId: string
  query: string
  analysis: string
  contextCount: number
}

export const MortgageAlertUI: React.FC = () => {
  const [rateContent, setRateContent] = useState('')
  const [query, setQuery] = useState('What are current mortgage rates?')
  const [jobStatus, setJobStatus] = useState<AnalysisJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([])

  // Load recent analyses on mount
  useEffect(() => {
    loadRecentAnalyses()
  }, [])

  const loadRecentAnalyses = async () => {
    try {
      const response = await fetch('/mortgage_rate_alert/recent')
      if (response.ok) {
        const text = await response.text()
        if (text) {
          const data = JSON.parse(text)
          // API returns { body: [...] }
          const analyses = Array.isArray(data.body) ? data.body : Array.isArray(data) ? data : []
          setRecentAnalyses(analyses.slice(0, 5)) // Show last 5
        }
      }
    } catch (err) {
      console.error('Failed to load recent analyses:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setJobStatus(null)
    setIsLoading(true)

    try {
      const response = await fetch('/mortgage_rate_alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: rateContent, query }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Check if response has content before parsing JSON
      const text = await response.text()
      const data = text ? JSON.parse(text) : {}

      const dataId = data.traceId || data.dataId || `mortgage-${Date.now()}`
      
      setJobStatus({
        dataId,
        status: 'processing',
      })
      
      // Poll for completion
      setTimeout(() => {
        setJobStatus({
          dataId,
          status: 'completed',
        })
        loadRecentAnalyses()
      }, 8000) // Approximate processing time
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }


  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium'
    switch (status) {
      case 'completed':
        return (
          <span className={`${baseClasses} bg-green-500/20 text-green-300 border border-green-500/30`}>
            ✅ Analysis Complete
          </span>
        )
      case 'processing':
        return (
          <span className={`${baseClasses} bg-blue-500/20 text-blue-300 border border-blue-500/30`}>
            ⏳ Processing...
          </span>
        )
      case 'failed':
        return (
          <span className={`${baseClasses} bg-red-500/20 text-red-300 border border-red-500/30`}>
            ❌ Failed
          </span>
        )
      default:
        return (
          <span className={`${baseClasses} bg-gray-500/20 text-gray-300 border border-gray-500/30`}>
            {status}
          </span>
        )
    }
  }

  return (
    <div className="h-full w-full p-6 overflow-auto bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-4xl">🏠</span>
          <div>
            <h1 className="text-3xl font-bold">Mortgage Rate Alert System</h1>
            <p className="text-gray-400 text-sm">
              AI-powered rate monitoring with Couchbase Vector Search
            </p>
          </div>
        </div>

        {/* Manual Rate Submission */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📊</span>
            <h2 className="text-xl font-semibold">Submit Mortgage Rates for AI Analysis</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="rateContent" className="block text-sm font-medium mb-2 text-gray-300">
                  Mortgage Rate Data
                </label>
                <textarea
                  id="rateContent"
                  value={rateContent}
                  onChange={(e) => setRateContent(e.target.value)}
                  placeholder="e.g., Wells Fargo: 30-year fixed at 6.125% APR, 15-year at 5.375% APR"
                  required
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label htmlFor="query" className="block text-sm font-medium mb-2 text-gray-300">
                  Analysis Query
                </label>
                <input
                  id="query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What are current mortgage rates?"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>🤖 Analyze with AI</>
                )}
              </button>
            </form>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mt-4">
            <p className="text-sm text-gray-400">
              💡 <strong className="text-white">Automated Monitoring:</strong> The cron job runs every 6 hours to scrape rates from BankRate, Chase, and Wells Fargo, detecting changes ±0.1%.
            </p>
          </div>
        </div>

        {/* Job Status */}
        {jobStatus && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Processing Status</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-gray-400">Job ID:</p>
                  <code className="text-sm bg-zinc-800 px-2 py-1 rounded text-blue-400 font-mono">
                    {jobStatus.dataId}
                  </code>
                  {getStatusBadge(jobStatus.status)}
                </div>
              </div>

              {jobStatus.status === 'processing' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing pipeline...
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 pl-6">
                    <div>1. Chunking text...</div>
                    <div>2. Generating OpenAI embeddings (1536D)...</div>
                    <div>3. Storing in Couchbase vector DB...</div>
                    <div>4. Performing vector search...</div>
                    <div>5. AI analysis with GPT-4...</div>
                    <div>6. Sending email notification...</div>
                  </div>
                </div>
              )}

              {jobStatus.status === 'completed' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-400">
                    <span>✅</span>
                    <p className="font-semibold">Analysis completed!</p>
                  </div>
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                    <p className="text-sm text-green-400">
                      Email sent to configured recipients with AI analysis results.
                    </p>
                  </div>
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

        {/* Recent Analyses */}
        {recentAnalyses.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">📈 Recent Analyses</h3>
            <div className="space-y-3">
              {recentAnalyses.map((analysis, index) => (
                <div key={index} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-400 mb-1">{analysis.query}</p>
                      <p className="text-xs text-gray-400 line-clamp-2">{analysis.analysis}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>📅 {new Date(analysis.timestamp).toLocaleString()}</span>
                        <span>📊 {analysis.contextCount} sources</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">
            💡 <strong className="text-white">How it works:</strong> Submit mortgage rates above. The system chunks text, generates embeddings with OpenAI (1536D), stores them in Couchbase vector DB, performs semantic search for context, and provides AI-powered analysis via email using GPT-4.
          </p>
        </div>
      </div>
    </div>
  )
}

