/**
 * ContractGPT Panel Component
 * 
 * Beautiful Workbench panel for contract upload and analysis visualization.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'

// Types
interface RiskFinding {
  id: string
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  excerpt: string
  suggestedEditLanguage?: string
  confidenceScore?: number
  policyViolation?: boolean
}

interface Analysis {
  id: string
  executiveSummary: string
  overallScore: number
  recommendedAction: string
  risks: RiskFinding[]
  risksBySeverity: {
    critical: number
    high: number
    medium: number
    low: number
  }
  keyNegotiationPoints: Array<{
    point: string
    priority: number
    suggestedApproach: string
  }>
  actionItems: Array<{
    action: string
    priority: string
    owner?: string
  }>
  totalPipelineTimeMs: number
}

interface Contract {
  id: string
  fileName?: string
  status: string
  createdAt: string
  context?: {
    customerName?: string
    dealValue?: number
    contractType?: string
  }
  analysis?: Analysis
}

interface ProgressUpdate {
  status: string
  step: string
  message: string
  progress: number
}

// Severity color mapping with vibrant, distinctive colors
const severityColors = {
  critical: { 
    bg: 'bg-red-950/40', 
    border: 'border-red-500/50', 
    text: 'text-red-400', 
    badge: 'bg-red-500/20 text-red-300 border-red-500/40' 
  },
  high: { 
    bg: 'bg-orange-950/40', 
    border: 'border-orange-500/50', 
    text: 'text-orange-400', 
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40' 
  },
  medium: { 
    bg: 'bg-yellow-950/40', 
    border: 'border-yellow-500/50', 
    text: 'text-yellow-400', 
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' 
  },
  low: { 
    bg: 'bg-blue-950/40', 
    border: 'border-blue-500/50', 
    text: 'text-blue-400', 
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
  },
}

// Score color based on value
const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

const getScoreGradient = (score: number) => {
  if (score >= 80) return 'from-emerald-500/20 to-emerald-900/40 border-emerald-500/50 text-emerald-400'
  if (score >= 60) return 'from-yellow-500/20 to-yellow-900/40 border-yellow-500/50 text-yellow-400'
  if (score >= 40) return 'from-orange-500/20 to-orange-900/40 border-orange-500/50 text-orange-400'
  return 'from-red-500/20 to-red-900/40 border-red-500/50 text-red-400'
}

// Format action recommendation
const formatAction = (action: string) => {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Main Component
export const ContractGptPanel: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<ProgressUpdate | null>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'details'>('upload')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    dealValue: '',
    contractType: 'msa',
    jurisdiction: '',
    urgency: 'normal',
    useDeepResearch: false,
  })

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    try {
      const res = await fetch('/__motia/contract-gpt/contracts')
      const data = await res.json()
      setContracts(data.contracts || [])
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
    }
  }, [])

  useEffect(() => {
    fetchContracts()
    const interval = setInterval(fetchContracts, 5000)
    return () => clearInterval(interval)
  }, [fetchContracts])

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadProgress({ status: 'uploading', step: 'Upload', message: 'Reading file...', progress: 10 })

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Remove data URL prefix
          const base64 = result.split(',')[1] || result
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Determine document type
      const ext = file.name.split('.').pop()?.toLowerCase()
      let documentType = 'text'
      if (ext === 'pdf') documentType = 'pdf'
      else if (ext === 'docx' || ext === 'doc') documentType = 'docx'

      setUploadProgress({ status: 'submitting', step: 'Submit', message: 'Submitting for analysis...', progress: 30 })

      // Submit to API
      const response = await fetch('/contracts/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: base64,
          documentType,
          fileName: file.name,
          context: {
            customerName: formData.customerName || undefined,
            dealValue: formData.dealValue ? Number(formData.dealValue) : undefined,
            contractType: formData.contractType,
            jurisdiction: formData.jurisdiction || undefined,
            urgency: formData.urgency,
          },
          useDeepResearch: formData.useDeepResearch,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setUploadProgress({ 
          status: 'processing', 
          step: 'Processing', 
          message: `Analysis started! ID: ${result.id}`, 
          progress: 50 
        })

        // Start polling for updates
        pollAnalysis(result.id)
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      setUploadProgress({ 
        status: 'failed', 
        step: 'Error', 
        message: (error as Error).message, 
        progress: 0 
      })
      setIsUploading(false)
    }
  }

  // Poll for analysis completion with exponential backoff
  const pollAnalysis = async (contractId: string) => {
    let pollCount = 0
    const maxPolls = 60 // Stop after ~3 minutes
    
    const poll = async () => {
      if (pollCount >= maxPolls) {
        setUploadProgress({
          status: 'timeout',
          step: 'Timeout',
          message: 'Analysis is taking longer than expected. Check the History tab for updates.',
          progress: 0,
        })
        setIsUploading(false)
        return
      }
      
      pollCount++
      
      try {
        const res = await fetch(`/contracts/${contractId}/analysis`)
        const data = await res.json()

        const progressMap: Record<string, number> = {
          pending: 20,
          extracting_text: 30,
          generator_running: 45,
          generator_completed: 55,
          critic_running: 70,
          critic_completed: 80,
          refiner_running: 90,
          completed: 100,
          failed: 0,
        }

        setUploadProgress({
          status: data.status,
          step: data.progress?.currentStep || data.status,
          message: getStatusMessage(data.status),
          progress: progressMap[data.status] || 50,
        })

        if (data.status === 'completed' || data.status === 'failed') {
          setIsUploading(false)
          fetchContracts()
          
          if (data.status === 'completed') {
            // Auto-select the completed contract
            const contractRes = await fetch(`/__motia/contract-gpt/contracts/${contractId}`)
            const contractData = await contractRes.json()
            setSelectedContract({ ...contractData.contract, analysis: contractData.analysis })
            setActiveTab('details')
          }
        } else {
          // Continue polling with increasing interval (5s, then 8s, then 10s max)
          const nextInterval = Math.min(5000 + (pollCount * 500), 10000)
          setTimeout(poll, nextInterval)
        }
      } catch (error) {
        console.error('Polling error:', error)
        // Retry after 5 seconds on error
        setTimeout(poll, 5000)
      }
    }
    
    // Start first poll after 3 seconds
    setTimeout(poll, 3000)
  }

  const getStatusMessage = (status: string) => {
    const messages: Record<string, string> = {
      pending: 'Queued for processing...',
      extracting_text: 'Extracting text from document...',
      generator_running: '🤖 Generator AI analyzing contract...',
      generator_completed: 'Draft analysis complete, starting Critic...',
      critic_running: '🔍 Critic AI reviewing findings...',
      critic_completed: 'Critique complete, starting Refiner...',
      refiner_running: '✨ Refiner AI creating final report...',
      completed: '✅ Analysis complete!',
      failed: '❌ Analysis failed',
    }
    return messages[status] || status
  }

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  // Render upload tab
  const renderUploadTab = () => (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-violet-500/10 mb-2 ring-1 ring-violet-500/20 shadow-lg shadow-violet-500/5">
          <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white tracking-tight">Contract Analysis</h2>
        <p className="text-zinc-400 text-sm max-w-[280px] mx-auto leading-relaxed">
          Upload any contract for comprehensive AI-powered risk assessment and policy validation
        </p>
      </div>

      {/* Upload Zone */}
      <div
        className={`relative group border border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer overflow-hidden ${
          dragActive 
            ? 'border-violet-500 bg-violet-500/10 scale-[1.02]' 
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div className="space-y-6 relative z-10">
            <div className="relative inline-flex">
              <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 animate-spin border-t-violet-500" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-violet-400">{Math.round(uploadProgress?.progress || 0)}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-white font-medium text-sm animate-pulse">{uploadProgress?.step}</p>
              <p className="text-zinc-500 text-xs">{uploadProgress?.message}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-zinc-400 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium text-sm mb-1">Click to upload</p>
              <p className="text-zinc-500 text-xs">or drag and drop PDF, DOCX, TXT</p>
            </div>
          </div>
        )}
        
        {/* Decorative background glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>

      {/* Context Form */}
      <div className="space-y-5 bg-zinc-900/30 rounded-3xl p-6 border border-zinc-800/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-4 bg-violet-500 rounded-full" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Deal Context</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Customer</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-zinc-300 text-sm focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all placeholder:text-zinc-700"
              placeholder="Acme Corp"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Value ($)</label>
            <input
              type="number"
              value={formData.dealValue}
              onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-zinc-300 text-sm focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all placeholder:text-zinc-700"
              placeholder="100,000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Type</label>
            <select
              value={formData.contractType}
              onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-zinc-300 text-sm focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all"
            >
              <option value="msa">Master Service Agreement</option>
              <option value="nda">Non-Disclosure Agreement</option>
              <option value="sow">Statement of Work</option>
              <option value="saas_agreement">SaaS Agreement</option>
              <option value="vendor_agreement">Vendor Agreement</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Urgency</label>
            <select
              value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-zinc-300 text-sm focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Jurisdiction</label>
          <input
            type="text"
            value={formData.jurisdiction}
            onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-zinc-300 text-sm focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all placeholder:text-zinc-700"
            placeholder="e.g. Delaware, USA"
          />
        </div>

        <div className="pt-2 border-t border-zinc-800/50">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={formData.useDeepResearch}
                onChange={(e) => setFormData({ ...formData, useDeepResearch: e.target.checked })}
                className="peer sr-only"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">Deep Research Agent</span>
              <p className="text-xs text-zinc-500 mt-0.5">Slower but more comprehensive analysis using external sources</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  )

  // Render history tab
  const renderHistoryTab = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-10">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Analysis History</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {contracts.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-zinc-400 font-medium mb-1">No contracts yet</p>
            <p className="text-zinc-600 text-sm">Upload a contract to see analysis history</p>
          </div>
        ) : (
          contracts.map((contract) => (
            <button
              key={contract.id}
              onClick={() => {
                setSelectedContract(contract)
                setActiveTab('details')
              }}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${
                selectedContract?.id === contract.id
                  ? 'bg-violet-500/5 border-violet-500/30 shadow-[0_0_20px_-5px_rgba(139,92,246,0.1)]'
                  : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-zinc-200 font-medium truncate text-sm group-hover:text-white transition-colors">
                    {contract.fileName || 'Untitled Contract'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="truncate">{contract.context?.customerName || 'No customer'}</span>
                    <span>•</span>
                    <span className="uppercase tracking-wide text-[10px]">{contract.context?.contractType || 'Unknown'}</span>
                  </div>
                  <p className="text-zinc-600 text-[10px]">
                    {new Date(contract.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex-shrink-0 self-center">
                  {contract.status === 'completed' && contract.analysis ? (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border font-bold text-sm bg-gradient-to-br ${getScoreGradient(contract.analysis.overallScore)}`}>
                      {contract.analysis.overallScore}
                    </div>
                  ) : contract.status === 'failed' ? (
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )

  // Render details tab
  const renderDetailsTab = () => {
    if (!selectedContract) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium">No Contract Selected</p>
            <p className="text-zinc-500 text-sm mt-1">Select a contract from history to view analysis details</p>
          </div>
          <button 
            onClick={() => setActiveTab('history')}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            View History
          </button>
        </div>
      )
    }

    const analysis = selectedContract.analysis

    if (!analysis) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-zinc-800 border-t-violet-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Analysis in Progress</h3>
            <p className="text-zinc-400 max-w-[260px] mx-auto leading-relaxed">
              Our AI agents are currently reviewing 
              <span className="text-white font-medium block mt-1">"{selectedContract.fileName}"</span>
            </p>
          </div>
          <div className="w-full max-w-[200px] bg-zinc-900 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full w-1/2 animate-shimmer" />
          </div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium">Status: {selectedContract.status.replace('_', ' ')}</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-zinc-900/50 to-transparent border-b border-zinc-800/50">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate leading-tight mb-1">
                {selectedContract.fileName || 'Contract Analysis'}
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
                <span>{Math.round(analysis.totalPipelineTimeMs / 1000)}s analysis</span>
                <span>•</span>
                <span>{new Date(selectedContract.createdAt).toLocaleDateString()}</span>
              </div>
              <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                analysis.recommendedAction === 'approve_as_is' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : analysis.recommendedAction === 'reject' 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                {formatAction(analysis.recommendedAction)}
              </div>
            </div>
            
            <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl border bg-gradient-to-br shadow-xl ${getScoreGradient(analysis.overallScore)}`}>
              <span className="text-3xl font-bold tracking-tight">{analysis.overallScore}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-80 mt-0.5">Score</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Executive Summary */}
          <section>
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-zinc-500" />
              Executive Summary
            </h4>
            <div className="bg-zinc-900/30 rounded-xl p-5 border border-zinc-800/50 leading-relaxed text-zinc-300 text-sm shadow-sm">
              {analysis.executiveSummary}
            </div>
          </section>

          {/* Risk Overview */}
          <section>
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-zinc-500" />
              Risk Distribution
            </h4>
            <div className="grid grid-cols-4 gap-3">
              {(['critical', 'high', 'medium', 'low'] as const).map((severity) => (
                <div
                  key={severity}
                  className={`p-3 rounded-xl border ${severityColors[severity].bg} ${severityColors[severity].border} flex flex-col items-center justify-center text-center transition-transform hover:scale-105 duration-200`}
                >
                  <span className={`text-2xl font-bold mb-1 ${severityColors[severity].text}`}>
                    {analysis.risksBySeverity[severity]}
                  </span>
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{severity}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Top Risks */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-zinc-500" />
                Key Findings ({analysis.risks.length})
              </h4>
            </div>
            
            <div className="space-y-3">
              {analysis.risks.slice(0, 5).map((risk) => (
                <div
                  key={risk.id}
                  className={`group p-4 rounded-xl border bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors ${severityColors[risk.severity].border}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-md border ${severityColors[risk.severity].badge}`}>
                      {risk.severity}
                    </span>
                    {risk.confidenceScore && (
                      <span className="text-[10px] text-zinc-600 font-medium" title="Confidence Score">
                        {risk.confidenceScore}% conf.
                      </span>
                    )}
                  </div>
                  
                  <h5 className="text-sm font-medium text-zinc-200 mb-1 leading-snug group-hover:text-white transition-colors">
                    {risk.title}
                  </h5>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                    {risk.description}
                  </p>
                  
                  {risk.suggestedEditLanguage && (
                    <div className="relative mt-3 p-3 bg-zinc-950/50 rounded-lg border border-zinc-800/50">
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 rounded-l-lg" />
                      <p className="text-[10px] font-medium text-emerald-500/80 uppercase tracking-wide mb-1">Suggested Edit</p>
                      <p className="text-xs text-zinc-300 font-mono leading-relaxed">{risk.suggestedEditLanguage}</p>
                    </div>
                  )}
                </div>
              ))}
              {analysis.risks.length > 5 && (
                <button className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-dashed border-zinc-800 rounded-lg hover:border-zinc-700 hover:bg-zinc-900/30">
                  Show {analysis.risks.length - 5} more risks...
                </button>
              )}
            </div>
          </section>

          {/* Action Items */}
          {analysis.actionItems.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-zinc-500" />
                Action Plan
              </h4>
              <div className="space-y-2">
                {analysis.actionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      item.priority === 'immediate' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                      item.priority === 'high' ? 'bg-orange-500' :
                      item.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 leading-snug">{item.action}</p>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide flex-shrink-0 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                      {item.priority}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-[420px] h-full bg-zinc-950 border-l border-zinc-800 flex flex-col font-sans selection:bg-violet-500/30 selection:text-violet-200">
      {/* Navigation */}
      <nav className="flex p-1 gap-1 bg-zinc-900/50 m-4 rounded-xl border border-zinc-800/50 backdrop-blur-md">
        {(['upload', 'history', 'details'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
              activeTab === tab
                ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {tab === 'upload' && (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </span>
            )}
            {tab === 'history' && (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </span>
            )}
            {tab === 'details' && (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Result
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'upload' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
          {renderUploadTab()}
        </div>
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'history' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
          {renderHistoryTab()}
        </div>
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'details' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
          {renderDetailsTab()}
        </div>
      </div>
    </div>
  )
}

export default ContractGptPanel

