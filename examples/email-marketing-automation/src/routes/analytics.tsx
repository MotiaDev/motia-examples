import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { fetchCampaigns, fetchDashboardStats, type Campaign, type CampaignStats } from '../lib/api'

export const Route = createFileRoute('/analytics')({
  component: Analytics,
})

function Analytics() {
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
      setCampaigns(campaignsData)
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return <div>Loading analytics...</div>
  }

  return (
    <div>
      <h1>📊 Analytics Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3>Total Emails Sent</h3>
          <p style={{ fontSize: '2.5rem', color: '#0066cc', marginTop: '0.5rem' }}>
            {stats?.emailsSent.toLocaleString() || 0}
          </p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Across all campaigns</p>
        </div>
        <div className="card">
          <h3>Average Open Rate</h3>
          <p style={{ fontSize: '2.5rem', color: '#0066cc', marginTop: '0.5rem' }}>
            {stats?.openRate.toFixed(1) || 0}%
          </p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Engagement metric</p>
        </div>
        <div className="card">
          <h3>Average Click Rate</h3>
          <p style={{ fontSize: '2.5rem', color: '#0066cc', marginTop: '0.5rem' }}>
            {stats?.clickRate.toFixed(1) || 0}%
          </p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Interaction metric</p>
        </div>
        <div className="card">
          <h3>Total Campaigns</h3>
          <p style={{ fontSize: '2.5rem', color: '#0066cc', marginTop: '0.5rem' }}>
            {stats?.totalCampaigns || 0}
          </p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Created campaigns</p>
        </div>
      </div>

      <div className="card">
        <h2>Campaign Performance</h2>
        {campaigns.length === 0 ? (
          <p style={{ color: '#666', marginTop: '1rem' }}>No campaigns with email data yet. Campaigns will appear here once emails are sent.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Campaign</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Audience</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Personalized</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Sent</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.$id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{campaign.name}</td>
                  <td style={{ padding: '0.75rem' }}>{campaign.targetAudience}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      background: campaign.status === 'processing' ? '#fef3c7' : campaign.status === 'scheduled' ? '#dbeafe' : '#dcfce7',
                      color: campaign.status === 'processing' ? '#92400e' : campaign.status === 'scheduled' ? '#1e40af' : '#166534'
                    }}>
                      {campaign.status || 'pending'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {campaign.personalizeContent ? '✅ Yes' : '❌ No'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{campaign.sentCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Audience Insights</h2>
        <p style={{ color: '#666', marginTop: '1rem', marginBottom: '1rem' }}>
          User data will be populated here once you add users to your Appwrite database.
        </p>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Currently showing campaign-based statistics. To see detailed user analytics, add users to the "users" table in Appwrite.
        </p>
      </div>
    </div>
  )
}

