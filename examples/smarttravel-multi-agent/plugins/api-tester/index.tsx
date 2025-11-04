import React, { useState, useEffect } from 'react'
import {
  Play,
  Save,
  Trash2,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Folder,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// Utility function for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ')
}

// Simple UI Components with Beautiful Colors
const Badge: React.FC<{ children: React.ReactNode; variant?: string; className?: string }> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variantClasses = {
    default: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm',
    outline: 'border-2 border-blue-400 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950',
    destructive: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm',
    success: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full',
        variantClasses[variant as keyof typeof variantClasses] || variantClasses.default,
        className,
      )}
    >
      {children}
    </span>
  )
}

const Button: React.FC<{
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: string
  size?: string
  className?: string
}> = ({ children, onClick, disabled, variant = 'default', size = 'default', className = '' }) => {
  const variantClasses = {
    default: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-400 disabled:shadow-none',
    outline: 'border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl',
  }
  const sizeClasses = {
    default: 'px-5 py-2.5',
    sm: 'px-4 py-2 text-sm',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95',
        variantClasses[variant as keyof typeof variantClasses] || variantClasses.default,
        sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.default,
        className,
      )}
    >
      {children}
    </button>
  )
}

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface Header {
  key: string
  value: string
  enabled: boolean
}

interface TestAssertion {
  type: 'status' | 'body' | 'header' | 'time'
  condition: string
  value: string
  enabled: boolean
}

interface SavedRequest {
  id: number
  name: string
  method: string
  url: string
  headers: Header[]
  body: string
  tests: TestAssertion[]
  savedAt: string
}

interface Response {
  status: number
  statusText?: string
  headers: Record<string, string>
  data: any
  time: number
  error?: string
}

interface TestResult {
  assertion: TestAssertion
  passed: boolean
  message: string
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const PRESET_ENDPOINTS = [
  {
    name: 'Trigger Travel Plan',
    method: 'POST',
    url: '/api/v1/travel-plan',
    body: '{\n  "destination": "Paris",\n  "startDate": "2025-12-01",\n  "endDate": "2025-12-07",\n  "budget": 5000,\n  "travelers": 2\n}',
  },
  { name: 'Get Plan Status', method: 'GET', url: '/api/v1/travel-plan/:planId', body: '' },
  {
    name: 'Search Flights',
    method: 'POST',
    url: '/api/v1/search-flights',
    body: '{\n  "origin": "NYC",\n  "destination": "Paris",\n  "date": "2025-12-01"\n}',
  },
  {
    name: 'Search Hotels',
    method: 'POST',
    url: '/api/v1/search-hotels',
    body: '{\n  "destination": "Paris",\n  "checkIn": "2025-12-01",\n  "checkOut": "2025-12-07"\n}',
  },
]

const getMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    PUT: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    PATCH: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  }
  return colors[method] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
}

export const ApiTester: React.FC = () => {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState<Header[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true },
  ])
  const [body, setBody] = useState('')
  const [tests, setTests] = useState<TestAssertion[]>([
    { type: 'status', condition: 'equals', value: '200', enabled: true },
  ])
  const [response, setResponse] = useState<Response | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'tests'>('body')
  const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'tests'>('body')
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [requestName, setRequestName] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    loadSavedRequests()
  }, [])

  const loadSavedRequests = async () => {
    try {
      const res = await fetch('/__motia/api-tester/saved-requests')
      const data = await res.json()
      setSavedRequests(data)
    } catch (error) {
      console.error('Failed to load saved requests:', error)
    }
  }

  const saveRequest = async () => {
    if (!requestName.trim()) return

    try {
      await fetch('/__motia/api-tester/saved-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: requestName,
          method,
          url,
          headers,
          body,
          tests,
        }),
      })
      await loadSavedRequests()
      setRequestName('')
      setShowSaveDialog(false)
    } catch (error) {
      console.error('Failed to save request:', error)
    }
  }

  const deleteRequest = async (id: number) => {
    try {
      await fetch(`/__motia/api-tester/saved-requests/${id}`, {
        method: 'DELETE',
      })
      await loadSavedRequests()
    } catch (error) {
      console.error('Failed to delete request:', error)
    }
  }

  const loadRequest = (req: SavedRequest) => {
    setMethod(req.method)
    setUrl(req.url)
    setHeaders(req.headers)
    setBody(req.body)
    setTests(req.tests)
  }

  const loadPreset = (preset: (typeof PRESET_ENDPOINTS)[0]) => {
    setMethod(preset.method)
    setUrl(preset.url)
    setBody(preset.body)
  }

  const sendRequest = async () => {
    setLoading(true)
    setResponse(null)
    setTestResults([])

    try {
      const enabledHeaders = headers
        .filter(h => h.enabled && h.key)
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {})

      const baseUrl = window.location.origin
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`

      const res = await fetch('/__motia/api-tester/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          url: fullUrl,
          headers: enabledHeaders,
          body: body ? JSON.parse(body) : undefined,
        }),
      })

      const responseData = await res.json()
      setResponse(responseData)

      // Run tests
      if (responseData && !responseData.error) {
        runTests(responseData)
      }
    } catch (error: any) {
      setResponse({
        status: 0,
        headers: {},
        data: { error: error.message },
        time: 0,
        error: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const runTests = (res: Response) => {
    const results: TestResult[] = tests
      .filter(t => t.enabled)
      .map(assertion => {
        let passed = false
        let message = ''

        try {
          switch (assertion.type) {
            case 'status':
              const expectedStatus = parseInt(assertion.value)
              passed = res.status === expectedStatus
              message = `Status is ${res.status}, expected ${expectedStatus}`
              break

            case 'time':
              const maxTime = parseInt(assertion.value)
              passed = res.time < maxTime
              message = `Response time is ${res.time}ms, expected < ${maxTime}ms`
              break

            case 'body':
              const bodyStr = JSON.stringify(res.data)
              passed = bodyStr.includes(assertion.value)
              message = `Body ${passed ? 'contains' : 'does not contain'} "${assertion.value}"`
              break

            case 'header':
              const [headerKey, headerValue] = assertion.value.split(':')
              passed = res.headers[headerKey.trim()] === headerValue.trim()
              message = `Header ${headerKey} ${passed ? 'matches' : 'does not match'}`
              break
          }
        } catch (error: any) {
          passed = false
          message = `Test error: ${error.message}`
        }

        return { assertion, passed, message }
      })

    setTestResults(results)
  }

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }])
  }

  const updateHeader = (index: number, field: keyof Header, value: any) => {
    const newHeaders = [...headers]
    newHeaders[index] = { ...newHeaders[index], [field]: value }
    setHeaders(newHeaders)
  }

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const addTest = () => {
    setTests([...tests, { type: 'status', condition: 'equals', value: '200', enabled: true }])
  }

  const updateTest = (index: number, field: keyof TestAssertion, value: any) => {
    const newTests = [...tests]
    newTests[index] = { ...newTests[index], [field]: value }
    setTests(newTests)
  }

  const removeTest = (index: number) => {
    setTests(tests.filter((_, i) => i !== index))
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 font-bold'
    if (status >= 300 && status < 400) return 'text-blue-600 font-bold'
    if (status >= 400 && status < 500) return 'text-orange-600 font-bold'
    if (status >= 500) return 'text-red-600 font-bold'
    return 'text-gray-600'
  }

  return (
    <div className="h-full flex bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-72 border-r border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Folder className="w-5 h-5" />
                Collections
              </h3>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                Presets
              </p>
              <div className="space-y-2">
                {PRESET_ENDPOINTS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadPreset(preset)}
                    className="w-full text-left p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 rounded-lg border border-transparent hover:border-blue-200 dark:hover:border-blue-700 transition-all group"
                  >
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-md mb-2',
                        getMethodColor(preset.method),
                      )}
                    >
                      {preset.method}
                    </span>
                    <div className="text-sm font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                      {preset.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                Saved Requests
              </p>
              <div className="space-y-2">
                {savedRequests.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    No saved requests yet
                  </p>
                ) : (
                  savedRequests.map(req => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all group"
                    >
                      <button onClick={() => loadRequest(req)} className="flex-1 text-left">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-md mb-1',
                            getMethodColor(req.method),
                          )}
                        >
                          {req.method}
                        </span>
                        <div className="text-sm font-medium truncate group-hover:text-gray-900 dark:group-hover:text-gray-100">
                          {req.name}
                        </div>
                      </button>
                      <button
                        onClick={() => deleteRequest(req.id)}
                        className="ml-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Sidebar Button */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute top-4 left-4 z-10 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-110"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Request Builder */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className={cn(
                  'px-4 py-2.5 border-2 rounded-lg font-bold text-sm shadow-sm transition-all',
                  getMethodColor(method),
                  'hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:outline-none'
                )}
              >
                {HTTP_METHODS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="Enter request URL (e.g., /api/v1/travel-plan)"
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
              />

              <Button onClick={sendRequest} disabled={loading || !url}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
                <Save className="w-4 h-4" />
              </Button>
            </div>

            {/* Save Dialog */}
            {showSaveDialog && (
              <Card className="p-4 border-2 border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={requestName}
                    onChange={e => setRequestName(e.target.value)}
                    placeholder="Enter a name for this request"
                    className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <Button onClick={saveRequest} size="sm">
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('body')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-md font-medium transition-all',
                  activeTab === 'body'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
                )}
              >
                Body
              </button>
              <button
                onClick={() => setActiveTab('headers')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-md font-medium transition-all',
                  activeTab === 'headers'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
                )}
              >
                Headers ({headers.filter(h => h.enabled).length})
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-md font-medium transition-all',
                  activeTab === 'tests'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
                )}
              >
                Tests ({tests.filter(t => t.enabled).length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="max-h-60 overflow-auto">
              {activeTab === 'body' && (
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full h-48 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
                />
              )}

              {activeTab === 'headers' && (
                <div className="space-y-2">
                  {headers.map((header, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={header.enabled}
                        onChange={e => updateHeader(idx, 'enabled', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={header.key}
                        onChange={e => updateHeader(idx, 'key', e.target.value)}
                        placeholder="Key"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={header.value}
                        onChange={e => updateHeader(idx, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={() => removeHeader(idx)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addHeader}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Header
                  </Button>
                </div>
              )}

              {activeTab === 'tests' && (
                <div className="space-y-2">
                  {tests.map((test, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={test.enabled}
                        onChange={e => updateTest(idx, 'enabled', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={test.type}
                        onChange={e => updateTest(idx, 'type', e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="status">Status Code</option>
                        <option value="body">Body Contains</option>
                        <option value="header">Header</option>
                        <option value="time">Response Time</option>
                      </select>
                      <input
                        type="text"
                        value={test.value}
                        onChange={e => updateTest(idx, 'value', e.target.value)}
                        placeholder={test.type === 'time' ? 'Max ms' : 'Expected value'}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={() => removeTest(idx)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addTest}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Test
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Response */}
        {response && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant={response.error ? 'destructive' : response.status >= 200 && response.status < 300 ? 'success' : 'destructive'}>
                    <span className={getStatusColor(response.status)}>
                      {response.status} {response.statusText || ''}
                    </span>
                  </Badge>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-600 font-bold">{response.time}ms</span>
                  </div>
                  {testResults.length > 0 && (
                    <Badge variant={testResults.every(t => t.passed) ? 'success' : 'destructive'}>
                      {testResults.filter(t => t.passed).length}/{testResults.length} Tests Passed
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 mx-4 mt-2 rounded-lg">
              <button
                onClick={() => setResponseTab('body')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-md font-medium transition-all',
                  responseTab === 'body'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
                )}
              >
                Body
              </button>
              <button
                onClick={() => setResponseTab('headers')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-md font-medium transition-all',
                  responseTab === 'headers'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
                )}
              >
                Headers
              </button>
              {testResults.length > 0 && (
                <button
                  onClick={() => setResponseTab('tests')}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-md font-medium transition-all',
                    responseTab === 'tests'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
                  )}
                >
                  Test Results
                </button>
              )}
            </div>

            <div className="flex-1 p-4 overflow-auto">
              {responseTab === 'body' && (
                <pre className="text-sm font-mono bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 overflow-auto shadow-inner">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              )}

              {responseTab === 'headers' && (
                <div className="space-y-2">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                        {key}:
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {responseTab === 'tests' && (
                <div className="space-y-3">
                  {testResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-4 rounded-xl flex items-start gap-4 border-2 shadow-sm',
                        result.passed
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                          : 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800',
                      )}
                    >
                      {result.passed ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-bold text-sm mb-1">
                          {result.assertion.type.toUpperCase()} Test
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {result.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
