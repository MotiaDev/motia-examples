import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { fetchCampaigns, fetchDashboardStats, type Campaign, type CampaignStats } from '../lib/api'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [statsData, campaignsData] = await Promise.all([
        fetchDashboardStats(),
        fetchCampaigns(),
      ])
      setStats(statsData)
      setCampaigns(campaignsData.slice(0, 5)) // Recent 5
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return <div>Loading dashboard...</div>
  }

  return (
    <div>
      <h1>📧 Email Marketing Dashboard</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3>Total Campaigns</h3>
          <p style={{ fontSize: '2rem', color: '#0066cc' }}>{stats?.totalCampaigns || 0}</p>
        </div>
        <div className="card">
          <h3>Emails Sent</h3>
          <p style={{ fontSize: '2rem', color: '#0066cc' }}>{stats?.emailsSent.toLocaleString() || 0}</p>
        </div>
        <div className="card">
          <h3>Open Rate</h3>
          <p style={{ fontSize: '2rem', color: '#0066cc' }}>{stats?.openRate.toFixed(1) || 0}%</p>
        </div>
        <div className="card">
          <h3>Click Rate</h3>
          <p style={{ fontSize: '2rem', color: '#0066cc' }}>{stats?.clickRate.toFixed(1) || 0}%</p>
        </div>
      </div>

      <div className="card">
        <h2>Recent Campaigns</h2>
        {campaigns.length === 0 ? (
          <p>No campaigns yet. <Link to="/campaigns/new">Create your first campaign</Link></p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Audience</th>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.$id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>{campaign.name}</td>
                  <td style={{ padding: '0.5rem' }}>{campaign.targetAudience}</td>
                  <td style={{ padding: '0.5rem' }}>{campaign.status || 'pending'}</td>
                  <td style={{ padding: '0.5rem' }}>
                    {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

