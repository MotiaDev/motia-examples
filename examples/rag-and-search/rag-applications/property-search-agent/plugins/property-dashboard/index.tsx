import { Badge, Button } from '@motiadev/ui'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Home,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// Utility function for className merging
const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(' ')
}

interface PropertyData {
  address: string
  price: string
  bedrooms: string
  bathrooms: string
  square_feet: string
  property_type: string
  listing_url: string
  agent_contact?: string
}

interface SearchProgress {
  searchId: string
  stage: string
  progress: number
  message: string
  timestamp: string
}

interface SearchResults {
  searchId: string
  status: string
  progress: number
  properties: PropertyData[]
  totalCount: number
  marketAnalysis?: {
    fullAnalysis: string
  }
  enrichmentData?: {
    schoolRatings?: string
    crimeStats?: string
  }
  neighborhoodAnalysis?: {
    topNeighborhoods?: string[]
  }
  message: string
  error?: string
}

interface SearchFormData {
  city: string
  state: string
  budgetMin: number
  budgetMax: number
  propertyType: string
  bedrooms: number
  bathrooms: number
  selectedWebsites: string[]
  specialFeatures: string[]
}

export const PropertyDashboard = () => {
  const [activeSearch, setActiveSearch] = useState<string | null>(null)
  const [progress, setProgress] = useState<SearchProgress | null>(null)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<SearchFormData>({
    city: 'Austin',
    state: 'TX',
    budgetMin: 300000,
    budgetMax: 800000,
    propertyType: 'Single Family',
    bedrooms: 3,
    bathrooms: 2,
    selectedWebsites: ['Zillow', 'Realtor.com'],
    specialFeatures: ['Good schools', 'Parks'],
  })

  // Poll for results
  const pollResults = useCallback(async (searchId: string) => {
    try {
      const response = await fetch(`/api/property-search/${searchId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Poll results:', data) // Debug log
      setResults(data)

      // Handle completion or error status
      if (data.status === 'completed') {
        setIsSearching(false)
        setActiveSearch(null)
        setError(null)
      } else if (data.status === 'error') {
        setIsSearching(false)
        setActiveSearch(null)
        setError(data.message || data.error || 'Property search failed')
      }
    } catch (err) {
      console.error('Failed to fetch results:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch results')
      setIsSearching(false)
      setActiveSearch(null)
    }
  }, [])

  // Start polling when we have an active search
  useEffect(() => {
    if (!activeSearch) return

    const interval = setInterval(() => {
      pollResults(activeSearch)
    }, 3000)

    // Initial fetch
    pollResults(activeSearch)

    return () => clearInterval(interval)
  }, [activeSearch, pollResults])

  // Start a new property search
  const startSearch = async () => {
    setIsSearching(true)
    setError(null)
    setResults(null)
    setProgress(null)

    try {
      const response = await fetch('/api/property-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city: formData.city,
          state: formData.state,
          budgetRange: {
            min: formData.budgetMin,
            max: formData.budgetMax,
          },
          propertyType: formData.propertyType,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          selectedWebsites: formData.selectedWebsites,
          specialFeatures: formData.specialFeatures,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setActiveSearch(data.searchId)
      } else {
        throw new Error(data.error || 'Failed to start search')
      }
    } catch (err) {
      console.error('Search failed:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
      setIsSearching(false)
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'searching_properties':
        return 'bg-blue-500'
      case 'analyzing':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatPrice = (price: string) => {
    return price.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 bg-zinc-900">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Property Search Dashboard</h1>
          <Badge variant="default">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered
          </Badge>
        </div>
        {activeSearch && (
          <Badge variant="secondary" className="text-xs font-mono">
            Search ID: {activeSearch.slice(0, 16)}...
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Search Form */}
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Search Criteria
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  disabled={isSearching}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  disabled={isSearching}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Property Type</label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  disabled={isSearching}
                >
                  <option>Single Family</option>
                  <option>Condo</option>
                  <option>Townhouse</option>
                  <option>Multi-Family</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Min Budget ($)</label>
                <input
                  type="number"
                  value={formData.budgetMin}
                  onChange={(e) =>
                    setFormData({ ...formData, budgetMin: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  disabled={isSearching}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Budget ($)</label>
                <input
                  type="number"
                  value={formData.budgetMax}
                  onChange={(e) =>
                    setFormData({ ...formData, budgetMax: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  disabled={isSearching}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bedrooms</label>
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  disabled={isSearching}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button onClick={startSearch} disabled={isSearching} className="flex-1 md:flex-none md:w-auto">
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Home className="w-4 h-4 mr-2" />
                    Start Property Search
                  </>
                )}
              </Button>
              {isSearching && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSearching(false)
                    setActiveSearch(null)
                  }}
                  className="flex-1 md:flex-none md:w-auto"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Stop Search
                </Button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {(error || (results && results.status === 'error')) && (
            <div className="p-4 border-red-500 bg-red-50 dark:bg-red-950 border rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">{error || results?.message || results?.error || 'An error occurred'}</p>
                  {results && results.error && results.message && results.error !== results.message && (
                    <p className="text-sm mt-1">{results.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Progress Display */}
          {isSearching && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                Search in Progress
              </h2>
              <div className="space-y-4">
                {results ? (
                  <>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">{results.message || 'Processing...'}</span>
                        <span className="text-sm text-zinc-400">
                          {Math.round((results.progress || 0) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${(results.progress || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="default" className="gap-1">
                        <span
                          className={cn('w-2 h-2 rounded-full', getStageColor(results.status))}
                        />
                        {results.status}
                      </Badge>
                      {results.totalCount > 0 && (
                        <Badge variant="secondary">{results.totalCount} properties found</Badge>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-zinc-400">Initializing search...</p>
                    <p className="text-sm text-zinc-500 mt-2">Triggering 4 parallel processors</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Display */}
          {results && results.properties && results.properties.length > 0 && (
            <>
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-400">Properties Found</p>
                      <p className="text-2xl font-bold">{results.totalCount}</p>
                    </div>
                    <Home className="w-8 h-8 text-blue-500 opacity-50" />
                  </div>
                </div>
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-400">Avg Price</p>
                      <p className="text-2xl font-bold">
                        $
                        {Math.round(
                          results.properties.reduce(
                            (sum, p) => sum + parseInt(p.price.replace(/[$,]/g, '')),
                            0,
                          ) / results.properties.length,
                        ).toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
                  </div>
                </div>
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-400">Status</p>
                      <p className="text-2xl font-bold flex items-center gap-2">
                        {results.status === 'completed' ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : (
                          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        )}
                        {results.status}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              {results.marketAnalysis && (
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    AI Market Analysis
                  </h2>
                  <p className="text-zinc-300 leading-relaxed">
                    {results.marketAnalysis.fullAnalysis}
                  </p>
                </div>
              )}

              {/* Property Cards */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Properties ({results.properties.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.properties.map((property, idx) => (
                    <div key={idx} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg hover:shadow-xl hover:border-zinc-700 transition-all">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <Badge variant="default">{property.property_type}</Badge>
                          <span className="text-lg font-bold text-blue-500">
                            {formatPrice(property.price)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {property.address}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-zinc-400">Beds</p>
                            <p className="font-medium">{property.bedrooms}</p>
                          </div>
                          <div>
                            <p className="text-zinc-400">Baths</p>
                            <p className="font-medium">{property.bathrooms}</p>
                          </div>
                          <div>
                            <p className="text-zinc-400">Sq Ft</p>
                            <p className="font-medium">{property.square_feet}</p>
                          </div>
                        </div>
                        {property.agent_contact && (
                          <p className="text-xs text-zinc-400">
                            Agent: {property.agent_contact}
                          </p>
                        )}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open(property.listing_url, '_blank')}
                        >
                          View Listing
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Debug Info (shown when there's an error or search is running) */}
          {(isSearching || results) && (
            <details className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <summary className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300">
                Debug Information (click to expand)
              </summary>
              <div className="mt-3 space-y-2">
                <div className="text-xs">
                  <span className="text-zinc-500">Search ID:</span>{' '}
                  <span className="font-mono text-zinc-300">{activeSearch || 'None'}</span>
                </div>
                <div className="text-xs">
                  <span className="text-zinc-500">Is Searching:</span>{' '}
                  <span className="font-mono text-zinc-300">{isSearching ? 'Yes' : 'No'}</span>
                </div>
                {results && (
                  <>
                    <div className="text-xs">
                      <span className="text-zinc-500">Status:</span>{' '}
                      <span className="font-mono text-zinc-300">{results.status}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-zinc-500">Progress:</span>{' '}
                      <span className="font-mono text-zinc-300">{(results.progress * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-zinc-500">Properties Count:</span>{' '}
                      <span className="font-mono text-zinc-300">{results.totalCount || 0}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-zinc-500">Message:</span>{' '}
                      <span className="font-mono text-zinc-300">{results.message || 'N/A'}</span>
                    </div>
                    <div className="mt-2 max-h-40 overflow-auto">
                      <pre className="text-xs text-zinc-400 bg-zinc-950 p-2 rounded">
                        {JSON.stringify(results, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </details>
          )}

          {/* Empty State */}
          {!isSearching && !results && (
            <div className="p-12 text-center bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
              <Building2 className="w-16 h-16 mx-auto text-zinc-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ready to Find Your Dream Home?</h3>
              <p className="text-zinc-400 mb-6">
                Enter your search criteria above and click "Start Property Search" to begin.
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Badge variant="outline">⚡ 4 Parallel Processors</Badge>
                <Badge variant="outline">🤖 AI-Powered Analysis</Badge>
                <Badge variant="outline">🌐 Multiple Websites</Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

