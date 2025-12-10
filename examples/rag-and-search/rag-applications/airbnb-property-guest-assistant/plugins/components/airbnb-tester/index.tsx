import React, { useState } from 'react'

type TabType = 'ingest' | 'status' | 'query'

interface IngestionResponse {
  ingestion_id: string
  property_id: string
  status: string
  documents_queued: number
  created_at: string
}

interface StatusResponse {
  ingestion_id: string
  property_id: string
  status: string
  progress: {
    documents_discovered: number
    documents_parsed: number
    documents_chunked: number
    documents_embedded: number
    total_documents: number
  }
  chunks_created: number
  errors: string[]
  created_at: string
  updated_at: string
}

interface QueryResponse {
  answer: string
  confidence: string
  sources: string[]
  property_id: string
}

export const AirbnbTester: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('ingest')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Ingest form state
  const [propertyId, setPropertyId] = useState('beach_house_123')
  const [documentUrl, setDocumentUrl] = useState('')
  const [docType, setDocType] = useState('house_manual')
  const [language, setLanguage] = useState('en')
  const [notifyEmail, setNotifyEmail] = useState('')

  // Status form state
  const [ingestionId, setIngestionId] = useState('')

  // Query form state
  const [queryPropertyId, setQueryPropertyId] = useState('beach_house_123')
  const [question, setQuestion] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  const handleIngest = async () => {
    if (!propertyId || !documentUrl) {
      setError('Property ID and Document URL are required')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          sources: [
            {
              url: documentUrl,
              doc_type: docType,
              language: language,
            },
          ],
          notify_email: notifyEmail || undefined,
          overwrite_existing: true,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Ingestion failed')
      }

      setResult(data)
      setIngestionId(data.ingestion_id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckStatus = async () => {
    if (!ingestionId) {
      setError('Ingestion ID is required')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/ingest/${ingestionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get status')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleQuery = async () => {
    if (!queryPropertyId || !question) {
      setError('Property ID and Question are required')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: queryPropertyId,
          question: question,
          language: 'en',
          guest_email: guestEmail || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Query failed')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'ingest' as TabType, label: '📥 Ingest', icon: '📄' },
    { id: 'status' as TabType, label: '📊 Status', icon: '🔍' },
    { id: 'query' as TabType, label: '💬 Query', icon: '❓' },
  ]

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>🏠</span>
          <span>Airbnb Guest Assistant Tester</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Test document ingestion and guest Q&A
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              setResult(null)
              setError(null)
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-zinc-700 text-white border-b-2 border-emerald-500'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Ingest Tab */}
        {activeTab === 'ingest' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Property ID *</label>
              <input
                type="text"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                placeholder="e.g., beach_house_123"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Document URL *</label>
              <input
                type="text"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://example.com/house-manual.pdf"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="house_manual">House Manual</option>
                  <option value="local_guide">Local Guide</option>
                  <option value="appliance_manual">Appliance Manual</option>
                  <option value="policy">Policy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Notify Email (optional)</label>
              <input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="host@example.com"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleIngest}
              disabled={loading}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-600 rounded text-sm font-medium transition-colors"
            >
              {loading ? '⏳ Starting Ingestion...' : '🚀 Start Ingestion'}
            </button>
          </div>
        )}

        {/* Status Tab */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Ingestion ID *</label>
              <input
                type="text"
                value={ingestionId}
                onChange={(e) => setIngestionId(e.target.value)}
                placeholder="ing_abc123def456"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleCheckStatus}
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 rounded text-sm font-medium transition-colors"
            >
              {loading ? '⏳ Checking...' : '🔍 Check Status'}
            </button>

            <button
              onClick={handleCheckStatus}
              disabled={loading || !ingestionId}
              className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 rounded text-sm font-medium transition-colors"
            >
              🔄 Refresh Status
            </button>
          </div>
        )}

        {/* Query Tab */}
        {activeTab === 'query' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Property ID *</label>
              <input
                type="text"
                value={queryPropertyId}
                onChange={(e) => setQueryPropertyId(e.target.value)}
                placeholder="e.g., beach_house_123"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Question *</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="How do I use the induction stove?"
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-sm focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Guest Email (optional)</label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="guest@example.com"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleQuery}
              disabled={loading}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-600 rounded text-sm font-medium transition-colors"
            >
              {loading ? '⏳ Asking...' : '💬 Ask Question'}
            </button>

            {/* Quick Questions */}
            <div className="pt-2">
              <label className="block text-xs text-zinc-400 mb-2">Quick Questions:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  'What time is checkout?',
                  'How do I use the WiFi?',
                  'Where are the extra towels?',
                  'Is there parking?',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuestion(q)}
                    className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded">
            <p className="text-sm text-red-400">❌ {error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="p-3 bg-zinc-800 border border-zinc-600 rounded">
            <h4 className="text-xs text-zinc-400 mb-2 font-medium">Response:</h4>
            
            {/* Ingestion Response */}
            {activeTab === 'ingest' && result.ingestion_id && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Ingestion ID:</span>
                  <span className="text-emerald-400 font-mono">{result.ingestion_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Status:</span>
                  <span className="text-yellow-400">{result.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Documents Queued:</span>
                  <span>{result.documents_queued}</span>
                </div>
                <p className="text-xs text-zinc-500 pt-2">
                  💡 Copy the Ingestion ID and check status in the Status tab
                </p>
              </div>
            )}

            {/* Status Response */}
            {activeTab === 'status' && result.progress && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Status:</span>
                  <span className={
                    result.status === 'completed' ? 'text-emerald-400' :
                    result.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                  }>
                    {result.status === 'completed' ? '✅' : result.status === 'failed' ? '❌' : '⏳'} {result.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Progress</span>
                    <span>{result.progress.documents_embedded}/{result.progress.total_documents}</span>
                  </div>
                  <div className="h-2 bg-zinc-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{
                        width: `${(result.progress.documents_embedded / result.progress.total_documents) * 100}%`
                      }}
                    />
                  </div>
                </div>

                <div className="text-xs space-y-1 text-zinc-400">
                  <div>📥 Discovered: {result.progress.documents_discovered}</div>
                  <div>📄 Parsed: {result.progress.documents_parsed}</div>
                  <div>✂️ Chunked: {result.progress.documents_chunked}</div>
                  <div>🔢 Embedded: {result.progress.documents_embedded}</div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Chunks Created:</span>
                  <span className="text-emerald-400">{result.chunks_created}</span>
                </div>

                {result.errors && result.errors.length > 0 && (
                  <div className="p-2 bg-red-900/20 border border-red-800 rounded">
                    <p className="text-xs text-red-400 font-medium mb-1">Errors:</p>
                    {result.errors.slice(0, 3).map((err: string, i: number) => (
                      <p key={i} className="text-xs text-red-300">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Query Response */}
            {activeTab === 'query' && result.answer && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      result.confidence === 'high' ? 'bg-emerald-900 text-emerald-300' :
                      result.confidence === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {result.confidence === 'high' ? '🎯' : result.confidence === 'medium' ? '🤔' : '❓'} {result.confidence} confidence
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</p>
                </div>

                {result.sources && result.sources.length > 0 && (
                  <div className="pt-2 border-t border-zinc-700">
                    <p className="text-xs text-zinc-400 mb-1">Sources:</p>
                    <ul className="text-xs text-zinc-500 space-y-0.5">
                      {result.sources.map((src: string, i: number) => (
                        <li key={i}>📄 {src}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Raw JSON (collapsed) */}
            <details className="mt-3 pt-2 border-t border-zinc-700">
              <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">
                View raw JSON
              </summary>
              <pre className="mt-2 p-2 bg-zinc-900 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

export default AirbnbTester

