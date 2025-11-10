import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { fetchCampaigns, type Campaign } from '../../lib/api'

export const Route = createFileRoute('/campaigns/')({
  component: Campaigns,
})

function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCampaigns() {
      setLoading(true)
      const data = await fetchCampaigns()
      setCampaigns(data)
      setLoading(false)
    }
    loadCampaigns()
  }, [])

  if (loading) {
    return <div>Loading campaigns...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>📨 Email Campaigns</h1>
        <Link to="/campaigns/new">
          <button className="btn btn-primary">+ New Campaign</button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="card">
          <p>No campaigns found. Create your first campaign to get started!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {campaigns.map((campaign) => (
            <div key={campaign.$id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>{campaign.name}</h3>
                  <p style={{ color: '#666', marginTop: '0.5rem' }}>
                    Audience: <strong>{campaign.targetAudience}</strong> | Status: <strong>{campaign.status || 'pending'}</strong>
                  </p>
                  {campaign.sentCount && campaign.sentCount > 0 && (
                    <p style={{ color: '#666', marginTop: '0.25rem' }}>
                      Sent to {campaign.sentCount.toLocaleString()} recipients
                    </p>
                  )}
                  {campaign.scheduledFor && (
                    <p style={{ color: '#666', marginTop: '0.25rem' }}>
                      Scheduled for: {new Date(campaign.scheduledFor).toLocaleString()}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to="/campaigns/$id" params={{ id: campaign.$id }}>
                    <button className="btn">View</button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

