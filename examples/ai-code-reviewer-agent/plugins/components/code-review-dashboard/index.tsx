import React, { useState, useEffect } from 'react'

/**
 * GitHub-themed Code Review Dashboard Plugin for Motia Workbench
 * Monochromatic dark theme inspired by GitHub's UI
 */

interface Review {
  reviewId: string
  repository: string
  pullRequestNumber: number | null
  branch: string
  author: string
  status: string
  finalScore?: number
  recommendation?: string
  requestedAt: string
  completedAt?: string
}

interface ReviewProgress {
  reviewId: string
  stage: string
  message: string
  timestamp: string
  metadata?: {
    repository?: string
    pullRequest?: number
    progress?: number
    currentAgent?: string
    findings?: number
    score?: number
  }
}

const stages = [
  { id: 'submitted', label: 'Submitted', icon: '📥' },
  { id: 'generating_draft', label: 'Generating', icon: '🤖' },
  { id: 'draft_generated', label: 'Draft Ready', icon: '📝' },
  { id: 'critiquing', label: 'Critiquing', icon: '🔍' },
  { id: 'critique_completed', label: 'Critique Done', icon: '✅' },
  { id: 'refining', label: 'Refining', icon: '✨' },
  { id: 'review_completed', label: 'Review Done', icon: '📊' },
  { id: 'posting_to_github', label: 'Posting', icon: '📤' },
  { id: 'completed', label: 'Complete', icon: '🎉' },
  { id: 'failed', label: 'Failed', icon: '❌' }
]

export const CodeReviewDashboard: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [selectedReview, setSelectedReview] = useState<string | null>(null)
  const [progress, setProgress] = useState<ReviewProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'new'>('active')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  
  // Form state for new PR submission
  const [prUrl, setPrUrl] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [repoOwner, setRepoOwner] = useState('')
  const [repoName, setRepoName] = useState('')
  const [prNumber, setPrNumber] = useState('')
  const [branch, setBranch] = useState('main')
  const [commitSha, setCommitSha] = useState('')

  useEffect(() => {
    fetchReviews()
    const interval = setInterval(fetchReviews, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedReview) {
      const ws = new WebSocket(
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/streams/reviewProgress/${selectedReview}`
      )
      
      ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          if (data.type === 'update') {
            setProgress(data.payload)
        }
      }

      return () => ws.close()
    }
  }, [selectedReview])

  const fetchReviews = async () => {
    try {
      const response = await fetch('/reviews?limit=20')
      const data = await response.json()
      setReviews(data.reviews || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
      setLoading(false)
    }
  }

  // Parse GitHub PR URL to extract owner, repo, and PR number
  const parsePrUrl = (url: string) => {
    // Support formats:
    // https://github.com/owner/repo/pull/123
    // github.com/owner/repo/pull/123
    // owner/repo#123
    // owner/repo/pull/123
    const fullUrlMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/)
    if (fullUrlMatch) {
      return { owner: fullUrlMatch[1], repo: fullUrlMatch[2], pr: fullUrlMatch[3] }
    }
    
    const shortMatch = url.match(/^([^\/]+)\/([^#\/]+)(?:#|\/pull\/)(\d+)$/)
    if (shortMatch) {
      return { owner: shortMatch[1], repo: shortMatch[2], pr: shortMatch[3] }
    }
    
    return null
  }

  const handlePrUrlChange = (value: string) => {
    setPrUrl(value)
    setSubmitError(null)
    
    const parsed = parsePrUrl(value)
    if (parsed) {
      setRepoOwner(parsed.owner)
      setRepoName(parsed.repo)
      setPrNumber(parsed.pr)
    }
  }

  const submitNewReview = async () => {
    setSubmitError(null)
    setSubmitSuccess(null)
    setSubmitting(true)

    try {
      // Validate inputs
      const owner = repoOwner.trim()
      const repo = repoName.trim()
      const pr = parseInt(prNumber)

      if (!owner || !repo || !pr) {
        throw new Error('Please provide repository owner, name, and PR number')
      }

      // Build the webhook-like payload
      const payload = {
        pull_request: {
          number: pr,
          title: `PR #${pr}`,
          body: 'Review requested from dashboard',
          head: {
            ref: branch || 'main',
            sha: commitSha || 'HEAD'
          },
          base: {
            ref: 'main'
          },
          user: {
            login: owner
          },
          diff_url: `https://github.com/${owner}/${repo}/pull/${pr}.diff`,
          html_url: `https://github.com/${owner}/${repo}/pull/${pr}`
        },
        repository: {
          full_name: `${owner}/${repo}`,
          name: repo,
          owner: {
            login: owner
          },
          private: false
        },
        sender: {
          login: 'dashboard'
        },
        action: 'opened'
      }

      const response = await fetch('/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit review')
      }

      setSubmitSuccess(`Review submitted! ID: ${result.reviewId}`)
      setSelectedReview(result.reviewId)
      setActiveTab('active')
      
      // Clear form
      setPrUrl('')
      setRepoOwner('')
      setRepoName('')
      setPrNumber('')
      setBranch('main')
      setCommitSha('')
      
      // Refresh reviews list
      fetchReviews()
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-amber-400'
    return 'text-red-400'
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      submitted: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
      generating_draft: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
      draft_generated: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
      critiquing: { bg: 'bg-violet-500/20', text: 'text-violet-400' },
      critique_completed: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
      refining: { bg: 'bg-teal-500/20', text: 'text-teal-400' },
      review_completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
      posting_to_github: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
      completed: { bg: 'bg-green-500/20', text: 'text-green-400' },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400' }
    }
    const style = statusMap[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400' }
    return `${style.bg} ${style.text}`
  }

  const activeReviews = reviews.filter(r => !['completed', 'failed'].includes(r.status))
  const completedReviews = reviews.filter(r => ['completed', 'failed'].includes(r.status))

  return (
    <div className="h-full bg-[#0d1117] text-[#c9d1d9] font-mono overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-[#30363d] px-4 py-3 flex items-center justify-between bg-[#161b22]">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-[#58a6ff]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <h1 className="text-lg font-semibold text-[#f0f6fc]">AI Code Review</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8b949e]">
          {activeReviews.length} active • {completedReviews.length} completed
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#30363d] px-4 bg-[#161b22]">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 text-sm border-b-2 transition-colors ${
              activeTab === 'active'
                ? 'border-[#f78166] text-[#f0f6fc]'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <span className="mr-2">⚡</span>
          Active ({activeReviews.length})
        </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 text-sm border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-[#f78166] text-[#f0f6fc]'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <span className="mr-2">📋</span>
          History ({completedReviews.length})
        </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`py-2 px-1 text-sm border-b-2 transition-colors ${
              activeTab === 'new'
                ? 'border-[#238636] text-[#f0f6fc]'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <span className="mr-2">➕</span>
            New Review
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {activeTab === 'new' ? (
          /* New Review Form */
          <div className="w-full overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div className="text-center">
                <div className="text-4xl mb-2">🔍</div>
                <h2 className="text-xl font-semibold text-[#f0f6fc]">Request Code Review</h2>
                <p className="text-sm text-[#8b949e] mt-1">
                  Submit a GitHub PR for AI-powered code analysis
                </p>
              </div>

              {/* Success/Error Messages */}
              {submitSuccess && (
                <div className="bg-[#238636]/20 border border-[#238636]/50 rounded-lg p-4 text-[#3fb950]">
                  ✅ {submitSuccess}
                </div>
              )}
              {submitError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
                  ❌ {submitError}
                </div>
              )}

              {/* Quick URL Input */}
              <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                    GitHub PR URL
                  </label>
                  <input
                    type="text"
                    value={prUrl}
                    onChange={(e) => handlePrUrlChange(e.target.value)}
                    placeholder="https://github.com/owner/repo/pull/123 or owner/repo#123"
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
                  />
                  <p className="text-xs text-[#8b949e] mt-1">
                    Paste a PR URL to auto-fill the fields below
                  </p>
                </div>

                {/* Manual toggle */}
                <button
                  onClick={() => setManualMode(!manualMode)}
                  className="text-sm text-[#58a6ff] hover:underline flex items-center gap-1"
                >
                  {manualMode ? '▼' : '▶'} {manualMode ? 'Hide' : 'Show'} manual input fields
                </button>

                {/* Manual Fields */}
                {manualMode && (
                  <div className="space-y-4 pt-2 border-t border-[#30363d]">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                          Repository Owner *
                        </label>
                        <input
                          type="text"
                          value={repoOwner}
                          onChange={(e) => setRepoOwner(e.target.value)}
                          placeholder="e.g., rohitg00"
                          className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                          Repository Name *
                        </label>
                        <input
                          type="text"
                          value={repoName}
                          onChange={(e) => setRepoName(e.target.value)}
                          placeholder="e.g., awesome-project"
                          className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                          PR Number *
                        </label>
                        <input
                          type="number"
                          value={prNumber}
                          onChange={(e) => setPrNumber(e.target.value)}
                          placeholder="123"
                          className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                          Branch
                        </label>
                        <input
                          type="text"
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          placeholder="main"
                          className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                          Commit SHA
                        </label>
                        <input
                          type="text"
                          value={commitSha}
                          onChange={(e) => setCommitSha(e.target.value)}
                          placeholder="Optional"
                          className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              {(repoOwner || repoName || prNumber) && (
                <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
                  <div className="text-sm font-medium text-[#f0f6fc] mb-2">Preview</div>
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-[#8b949e]" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
                    </svg>
                    <a 
                      href={`https://github.com/${repoOwner}/${repoName}/pull/${prNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#58a6ff] hover:underline"
                    >
                      {repoOwner}/{repoName}#{prNumber}
                    </a>
                    <span className="text-[#8b949e]">on branch {branch || 'main'}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={submitNewReview}
                disabled={submitting || !repoOwner || !repoName || !prNumber}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                  submitting || !repoOwner || !repoName || !prNumber
                    ? 'bg-[#21262d] text-[#8b949e] cursor-not-allowed'
                    : 'bg-[#238636] hover:bg-[#2ea043] cursor-pointer'
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚙️</span>
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>🚀</span>
                    Start AI Code Review
                  </span>
                )}
              </button>

              {/* Info Box */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                <div className="text-sm font-medium text-[#f0f6fc] mb-2">ℹ️ How it works</div>
                <ol className="text-xs text-[#8b949e] space-y-1 list-decimal list-inside">
                  <li>Enter a GitHub PR URL or fill in the fields manually</li>
                  <li>Our AI agents will fetch and analyze the code diff</li>
                  <li><strong>Generator</strong> creates initial review with findings</li>
                  <li><strong>Critic</strong> validates and improves the review</li>
                  <li><strong>Refiner</strong> produces actionable feedback</li>
                  <li>Results are posted directly to GitHub as inline comments</li>
                </ol>
              </div>
            </div>
            </div>
          ) : (
            <>
            {/* Review List */}
            <div className="w-1/2 border-r border-[#30363d] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-pulse text-[#8b949e]">Loading reviews...</div>
                </div>
              ) : (
                <div className="divide-y divide-[#21262d]">
              {(activeTab === 'active' ? activeReviews : completedReviews).map((review) => (
                <div
                  key={review.reviewId}
                  onClick={() => setSelectedReview(review.reviewId)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedReview === review.reviewId
                          ? 'bg-[#1f6feb]/10 border-l-2 border-[#1f6feb]'
                          : 'hover:bg-[#161b22] border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#8b949e] flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
                        </svg>
                            <span className="text-sm font-medium text-[#58a6ff] truncate">
                          {review.repository}
                        </span>
                        {review.pullRequestNumber && (
                              <span className="text-xs text-[#8b949e]">#{review.pullRequestNumber}</span>
                        )}
                      </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-[#8b949e]">
                        <span>{review.branch}</span>
                        <span>•</span>
                        <span>{review.author}</span>
                      </div>
                    </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(review.status)}`}>
                        {review.status.replace(/_/g, ' ')}
                      </span>
                      {review.finalScore !== undefined && (
                            <span className={`text-sm font-bold ${getScoreColor(review.finalScore)}`}>
                          {review.finalScore}/100
                        </span>
                      )}
                    </div>
                  </div>
                      <div className="mt-2 text-xs text-[#8b949e]">
                    {new Date(review.requestedAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {(activeTab === 'active' ? activeReviews : completedReviews).length === 0 && (
                    <div className="p-8 text-center text-[#8b949e]">
                      <div className="text-4xl mb-2">{activeTab === 'active' ? '🎉' : '📭'}</div>
                  <div>{activeTab === 'active' ? 'No active reviews' : 'No completed reviews yet'}</div>
                      {activeTab === 'active' && (
                        <button
                          onClick={() => setActiveTab('new')}
                          className="mt-4 px-4 py-2 bg-[#238636] text-white rounded-md hover:bg-[#2ea043] transition-colors"
                        >
                          ➕ Submit New PR
                        </button>
                      )}
                    </div>
                  )}
                </div>
          )}
        </div>

        {/* Detail Panel */}
            <div className="w-1/2 overflow-y-auto bg-[#0d1117]">
          {selectedReview ? (
            <ReviewDetail 
              reviewId={selectedReview} 
              progress={progress}
              getScoreColor={getScoreColor}
                  getStatusBadge={getStatusBadge}
            />
          ) : (
                <div className="flex items-center justify-center h-full text-[#8b949e]">
                  <div className="text-center">
                    <div className="text-4xl mb-2">👈</div>
                <div>Select a review to see details</div>
                    <div className="mt-4">
                      <button
                        onClick={() => setActiveTab('new')}
                        className="px-4 py-2 bg-[#238636] text-white rounded-md hover:bg-[#2ea043] transition-colors"
                      >
                        ➕ Or submit a new PR
                      </button>
                    </div>
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  )
}

interface ReviewDetailProps {
  reviewId: string
  progress: ReviewProgress | null
  getScoreColor: (score?: number) => string
  getStatusBadge: (status: string) => string
}

const ReviewDetail: React.FC<ReviewDetailProps> = ({ reviewId, progress, getScoreColor, getStatusBadge }) => {
  const [review, setReview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReviewDetail()
  }, [reviewId])

  const fetchReviewDetail = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/reviews/${reviewId}?includeArtifacts=true`)
      const data = await response.json()
      setReview(data)
    } catch (error) {
      console.error('Failed to fetch review detail:', error)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-[#8b949e]">Loading...</div>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="flex items-center justify-center h-full text-[#8b949e]">
        Review not found
      </div>
    )
  }

  const currentStageIndex = stages.findIndex(s => s.id === (progress?.stage || review.status))

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#58a6ff]" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
          </svg>
          <h2 className="text-lg font-semibold text-[#f0f6fc]">{review.repository}</h2>
          {review.pullRequestNumber && (
            <span className="text-[#8b949e]">#{review.pullRequestNumber}</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-[#8b949e]">
          <span>Branch: {review.branch}</span>
          <span>•</span>
          <span>Author: {review.author}</span>
        </div>
      </div>

      {/* Progress Pipeline */}
      <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
        <div className="text-sm font-medium text-[#f0f6fc] mb-4">Pipeline Progress</div>
        <div className="relative">
          {/* Progress bar */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-[#30363d]">
            <div 
              className="h-full bg-gradient-to-r from-[#238636] to-[#58a6ff] transition-all duration-500"
              style={{ width: `${Math.min((currentStageIndex / (stages.length - 2)) * 100, 100)}%` }}
            />
          </div>
          
          {/* Stage indicators */}
          <div className="flex justify-between relative">
            {stages.slice(0, -1).map((stage, idx) => {
              const isComplete = idx < currentStageIndex
              const isCurrent = idx === currentStageIndex
              const isFailed = progress?.stage === 'failed' && idx === currentStageIndex
              
              return (
                <div key={stage.id} className="flex flex-col items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm z-10 transition-all ${
                      isFailed ? 'bg-red-500/20 border-2 border-red-500' :
                      isComplete ? 'bg-[#238636] border-2 border-[#238636]' :
                      isCurrent ? 'bg-[#1f6feb] border-2 border-[#1f6feb] animate-pulse' :
                      'bg-[#21262d] border-2 border-[#30363d]'
                    }`}
                  >
                    {stage.icon}
                  </div>
                  <span className={`mt-2 text-xs text-center ${
                    isCurrent ? 'text-[#58a6ff]' : 'text-[#8b949e]'
                  }`}>
                    {stage.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Current status message */}
        {progress && (
          <div className="mt-4 p-3 bg-[#0d1117] rounded border border-[#30363d]">
            <div className="flex items-center gap-2 text-sm">
              <span className="animate-spin">⚙️</span>
              <span className="text-[#58a6ff]">{progress.metadata?.currentAgent}</span>
            </div>
            <div className="mt-1 text-sm text-[#8b949e]">{progress.message}</div>
          </div>
        )}
      </div>

      {/* Score Card */}
      {review.finalScore !== undefined && (
        <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#8b949e]">Quality Score</div>
              <div className={`text-3xl font-bold ${getScoreColor(review.finalScore)}`}>
                {review.finalScore}<span className="text-lg text-[#8b949e]">/100</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#8b949e]">Recommendation</div>
              <div className={`text-lg font-medium ${
                review.recommendation === 'approve' ? 'text-emerald-400' :
                review.recommendation === 'request_changes' ? 'text-amber-400' :
                'text-[#58a6ff]'
              }`}>
                {review.recommendation === 'approve' ? '✅ Approve' :
                 review.recommendation === 'request_changes' ? '🔄 Request Changes' :
                 '💬 Comment'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Findings Summary */}
      {review.refined?.highlights && (
        <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
          <div className="text-sm font-medium text-[#f0f6fc] mb-3">Findings</div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Critical', count: review.refined.highlights.critical, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
              { label: 'High', count: review.refined.highlights.high, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
              { label: 'Medium', count: review.refined.highlights.medium, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
              { label: 'Low', count: review.refined.highlights.low, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
              { label: 'Info', count: review.refined.highlights.info, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
            ].map(item => (
              <div key={item.label} className={`p-2 rounded border text-center ${item.color}`}>
                <div className="text-xl font-bold">{item.count || 0}</div>
                <div className="text-xs">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive Summary */}
      {review.refined?.executiveSummary && (
        <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
          <div className="text-sm font-medium text-[#f0f6fc] mb-2">Summary</div>
          <div className="text-sm text-[#8b949e] leading-relaxed">
            {review.refined.executiveSummary}
          </div>
        </div>
      )}

      {/* Timeline */}
      {review.stages && (
        <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
          <div className="text-sm font-medium text-[#f0f6fc] mb-3">Timeline</div>
          <div className="space-y-2">
            {Object.entries(review.stages).map(([stage, data]: [string, any]) => (
              <div key={stage} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-[#238636]" />
                <span className="text-[#8b949e] capitalize">{stage.replace(/_/g, ' ')}</span>
                <span className="text-[#6e7681] ml-auto">
                  {new Date(data.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CodeReviewDashboard
