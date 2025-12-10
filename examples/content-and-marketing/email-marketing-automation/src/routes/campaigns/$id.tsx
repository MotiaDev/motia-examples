import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { fetchCampaign, fetchCampaignEmails, type Campaign, type CampaignEmailsResponse } from '../../lib/api'

export const Route = createFileRoute('/campaigns/$id')({
  component: CampaignDetail,
})

function CampaignDetail() {
  const { id } = Route.useParams()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [emails, setEmails] = useState<CampaignEmailsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailsLoading, setEmailsLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null)

  useEffect(() => {
    async function loadCampaign() {
      setLoading(true)
      const data = await fetchCampaign(id)
      setCampaign(data)
      setLoading(false)
    }
    loadCampaign()
  }, [id])

  useEffect(() => {
    async function loadEmails() {
      setEmailsLoading(true)
      const data = await fetchCampaignEmails(id)
      setEmails(data)
      setEmailsLoading(false)
    }
    loadEmails()
  }, [id])

  if (loading) {
    return <div>Loading campaign details...</div>
  }

  if (!campaign) {
    return (
      <div>
        <h1>Campaign Not Found</h1>
        <p>The campaign you're looking for doesn't exist.</p>
        <Link to="/campaigns">
          <button className="btn btn-primary">Back to Campaigns</button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/campaigns" style={{ color: '#0066cc', marginBottom: '1rem', display: 'inline-block' }}>
        ← Back to Campaigns
      </Link>
      
      <h1>📋 {campaign.name}</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Campaign ID: {id}</p>

      <div className="card">
        <h2>Campaign Details</h2>
        <p style={{ marginTop: '1rem' }}>
          <strong>Subject:</strong> {campaign.subject}<br />
          <strong>Template:</strong> {campaign.template}<br />
          <strong>Audience:</strong> {campaign.targetAudience}<br />
          <strong>Status:</strong> {campaign.status || 'pending'}<br />
          <strong>AI Personalization:</strong> {campaign.personalizeContent ? 'Enabled' : 'Disabled'}<br />
          {campaign.scheduledFor && (
            <>
              <strong>Scheduled For:</strong> {new Date(campaign.scheduledFor).toLocaleString()}<br />
            </>
          )}
          {campaign.createdAt && (
            <>
              <strong>Created:</strong> {new Date(campaign.createdAt).toLocaleString()}<br />
            </>
          )}
          {campaign.sentCount && (
            <>
              <strong>Sent:</strong> {campaign.sentCount.toLocaleString()} emails
            </>
          )}
        </p>
      </div>

      <div className="card">
        <h2>Performance Metrics</h2>
        <p style={{ color: '#666', marginTop: '1rem' }}>
          Analytics data will appear here once the campaign is sent and users begin interacting with emails.
        </p>
      </div>

      <div className="card">
        <h2>📧 Personalized Emails ({emails?.total || 0})</h2>
        {emailsLoading ? (
          <p style={{ color: '#666', marginTop: '1rem' }}>Loading emails...</p>
        ) : emails && emails.emails.length > 0 ? (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: '#666', marginBottom: '0.5rem' }}>
                Select a recipient to preview their personalized email:
              </p>
              <select 
                onChange={(e) => setSelectedEmail(parseInt(e.target.value))}
                value={selectedEmail ?? ''}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="">-- Select a recipient --</option>
                {emails.emails.map((email, idx) => (
                  <option key={idx} value={idx}>
                    {email.recipientName} ({email.recipientEmail})
                  </option>
                ))}
              </select>
            </div>

            {selectedEmail !== null && emails.emails[selectedEmail] && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#fafafa'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ color: '#333' }}>To:</strong>{' '}
                  <span style={{ color: '#666' }}>
                    {emails.emails[selectedEmail].recipientName} &lt;{emails.emails[selectedEmail].recipientEmail}&gt;
                  </span>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ color: '#333' }}>Subject:</strong>{' '}
                  <span style={{ color: '#666' }}>
                    {emails.emails[selectedEmail].personalizedSubject}
                  </span>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <strong style={{ color: '#333', display: 'block', marginBottom: '0.5rem' }}>
                    Content:
                  </strong>
                  <div 
                    style={{
                      padding: '1rem',
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      maxHeight: '400px',
                      overflow: 'auto'
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: emails.emails[selectedEmail].personalizedContent 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: '#666', marginTop: '1rem' }}>
            {campaign?.status === 'pending' || campaign?.status === 'processing' 
              ? '⏳ Emails are being personalized...'
              : 'No personalized emails found for this campaign.'}
          </p>
        )}
      </div>
    </div>
  )
}

