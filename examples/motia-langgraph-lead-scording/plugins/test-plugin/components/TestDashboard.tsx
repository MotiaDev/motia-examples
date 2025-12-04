import React, { useState, useCallback } from 'react'

interface FlowStatus {
  flowId: string
  status: string
  progress: {
    totalLeads: number
    processedLeads: number
    scoredLeads: number
    draftedLeads: number
    approvedLeads: number
    sentLeads: number
    failedLeads: number
  }
  createdAt: string
  updatedAt: string
}

interface Lead {
  id: string
  name: string
  company: string
  email: string
  role: string
  industry: string
  score: number
  tier: string
  draft?: {
    subject: string
    approved: boolean
  }
}

export const TestDashboard: React.FC = () => {
  const [csvPath, setCsvPath] = useState('leads.csv')
  const [flowId, setFlowId] = useState<string | null>(null)
  const [status, setStatus] = useState<FlowStatus | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setMessage(null)
    } else {
      setMessage(msg)
      setError(null)
    }
    setTimeout(() => {
      setMessage(null)
      setError(null)
    }, 5000)
  }

  // Start new flow with CSV
  const startFlow = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/lead-flows/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvPath, processImmediately: true }),
      })
      const data = await response.json()
      
      if (response.ok) {
        setFlowId(data.flowId)
        showMessage(`Flow started: ${data.flowId}`)
        // Auto-refresh status
        setTimeout(() => refreshStatus(data.flowId), 2000)
      } else {
        showMessage(data.error || 'Failed to start flow', true)
      }
    } catch (err) {
      showMessage('Network error', true)
    }
    setLoading(false)
  }, [csvPath])

  // Refresh flow status
  const refreshStatus = useCallback(async (id?: string) => {
    const targetId = id || flowId
    if (!targetId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/lead-flows/${targetId}/status`)
      const data = await response.json()
      
      if (response.ok) {
        setStatus(data)
        // Also fetch leads
        const leadsRes = await fetch(`/lead-flows/${targetId}/results?limit=50`)
        const leadsData = await leadsRes.json()
        if (leadsRes.ok) {
          setLeads(leadsData.leads || [])
        }
      } else {
        showMessage(data.error || 'Failed to get status', true)
      }
    } catch (err) {
      showMessage('Network error', true)
    }
    setLoading(false)
  }, [flowId])

  // Approve leads by tier
  const approveByTier = useCallback(async (tier: string) => {
    if (!flowId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/lead-flows/${flowId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data = await response.json()
      
      if (response.ok) {
        showMessage(`Approved ${data.approvedCount} ${tier} leads`)
        refreshStatus()
      } else {
        showMessage(data.error || 'Failed to approve', true)
      }
    } catch (err) {
      showMessage('Network error', true)
    }
    setLoading(false)
  }, [flowId, refreshStatus])

  // Send emails
  const sendEmails = useCallback(async () => {
    if (!flowId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/lead-flows/${flowId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 10 }),
      })
      const data = await response.json()
      
      if (response.ok) {
        showMessage(`Queued ${data.queuedCount} emails for sending`)
        refreshStatus()
      } else {
        showMessage(data.error || 'Failed to send', true)
      }
    } catch (err) {
      showMessage('Network error', true)
    }
    setLoading(false)
  }, [flowId, refreshStatus])

  // Send individual email
  const sendIndividual = useCallback(async (leadId: string) => {
    if (!flowId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/leads/${flowId}/${leadId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      
      if (response.ok) {
        showMessage(`Email sent to ${data.email}`)
        refreshStatus()
      } else {
        showMessage(data.error || 'Failed to send', true)
      }
    } catch (err) {
      showMessage('Network error', true)
    }
    setLoading(false)
  }, [flowId, refreshStatus])

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'hot': return '#ef4444'
      case 'warm': return '#f59e0b'
      case 'cold': return '#3b82f6'
      default: return '#6b7280'
    }
  }

  return (
    <div style={{ 
      padding: '24px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      color: '#e2e8f0'
    }}>
      <h1 style={{ 
        fontSize: '24px', 
        fontWeight: 700, 
        marginBottom: '24px',
        color: '#f8fafc'
      }}>
        🚀 Lead Score Flow Dashboard
      </h1>

      {/* Messages */}
      {message && (
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#065f46', 
          borderRadius: '8px', 
          marginBottom: '16px',
          color: '#d1fae5'
        }}>
          ✅ {message}
        </div>
      )}
      {error && (
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#991b1b', 
          borderRadius: '8px', 
          marginBottom: '16px',
          color: '#fecaca'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Start Flow Section */}
      <div style={{ 
        backgroundColor: '#1e293b', 
        borderRadius: '12px', 
        padding: '20px', 
        marginBottom: '20px',
        border: '1px solid #334155'
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#f1f5f9' }}>
          📁 Start New Flow
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            value={csvPath}
            onChange={(e) => setCsvPath(e.target.value)}
            placeholder="Path to CSV file (e.g., leads.csv)"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #475569',
              backgroundColor: '#0f172a',
              color: '#e2e8f0',
              fontSize: '14px'
            }}
          />
          <button
            onClick={startFlow}
            disabled={loading || !csvPath}
            style={{
              padding: '10px 20px',
              backgroundColor: loading ? '#475569' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            {loading ? '⏳ Processing...' : '▶️ Start Flow'}
          </button>
        </div>
        {flowId && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#94a3b8' }}>
            Current Flow: <code style={{ backgroundColor: '#334155', padding: '2px 6px', borderRadius: '4px' }}>{flowId}</code>
          </div>
        )}
      </div>

      {/* Status Section */}
      {status && (
        <div style={{ 
          backgroundColor: '#1e293b', 
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '20px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>
              📊 Flow Status: <span style={{ 
                color: status.status === 'completed' ? '#22c55e' : 
                       status.status === 'processing' ? '#f59e0b' : '#3b82f6'
              }}>{status.status}</span>
            </h2>
            <button
              onClick={() => refreshStatus()}
              disabled={loading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#334155',
                color: '#e2e8f0',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              🔄 Refresh
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { label: 'Total Leads', value: status.progress.totalLeads, color: '#6366f1' },
              { label: 'Scored', value: status.progress.scoredLeads, color: '#8b5cf6' },
              { label: 'Drafted', value: status.progress.draftedLeads, color: '#a855f7' },
              { label: 'Approved', value: status.progress.approvedLeads, color: '#22c55e' },
              { label: 'Sent', value: status.progress.sentLeads, color: '#14b8a6' },
              { label: 'Failed', value: status.progress.failedLeads, color: '#ef4444' },
            ].map((stat) => (
              <div key={stat.label} style={{ 
                backgroundColor: '#0f172a', 
                padding: '12px', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => approveByTier('hot')} disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              ✅ Approve Hot Leads
            </button>
            <button onClick={() => approveByTier('warm')} disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              ✅ Approve Warm Leads
            </button>
            <button onClick={sendEmails} disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              📧 Send Approved Emails
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      {leads.length > 0 && (
        <div style={{ 
          backgroundColor: '#1e293b', 
          borderRadius: '12px', 
          padding: '20px',
          border: '1px solid #334155'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#f1f5f9' }}>
            👥 Leads ({leads.length})
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#94a3b8' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#94a3b8' }}>Company</th>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#94a3b8' }}>Email</th>
                  <th style={{ textAlign: 'center', padding: '10px', color: '#94a3b8' }}>Score</th>
                  <th style={{ textAlign: 'center', padding: '10px', color: '#94a3b8' }}>Tier</th>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#94a3b8' }}>Draft Subject</th>
                  <th style={{ textAlign: 'center', padding: '10px', color: '#94a3b8' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', color: '#e2e8f0' }}>{lead.name}</td>
                    <td style={{ padding: '10px', color: '#94a3b8' }}>{lead.company}</td>
                    <td style={{ padding: '10px', color: '#94a3b8', fontSize: '12px' }}>{lead.email}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{ 
                        fontWeight: 600, 
                        color: lead.score >= 80 ? '#22c55e' : lead.score >= 60 ? '#f59e0b' : '#94a3b8'
                      }}>{lead.score}</span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'white',
                        backgroundColor: getTierColor(lead.tier)
                      }}>
                        {lead.tier.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#94a3b8', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.draft?.subject || '—'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {lead.draft?.approved && (
                        <button
                          onClick={() => sendIndividual(lead.id)}
                          disabled={loading}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#0ea5e9',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          📧 Send
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestDashboard
