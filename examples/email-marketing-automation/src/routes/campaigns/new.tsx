import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createCampaign } from '../../lib/api'

export const Route = createFileRoute('/campaigns/new')({
  component: NewCampaign,
})

function NewCampaign() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    template: 'promotional',
    targetAudience: 'vip_users',
    personalizeContent: true,
    scheduledFor: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    
    try {
      await createCampaign(formData)
      navigate({ to: '/campaigns' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1>✉️ Create New Campaign</h1>
      
      <div style={{ 
        padding: '1rem', 
        marginBottom: '1.5rem', 
        backgroundColor: '#e3f2fd', 
        border: '1px solid #2196f3',
        borderRadius: '8px',
        maxWidth: '600px'
      }}>
        <strong>🧪 Testing Tip:</strong> Use <strong>"VIP Customers (3 emails)"</strong> with AI enabled to avoid OpenAI rate limits on free tier!
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Campaign Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Email Subject *
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Template
            </label>
            <select
              value={formData.template}
              onChange={(e) => setFormData({ ...formData, template: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="newsletter">Newsletter</option>
              <option value="vip">VIP</option>
              <option value="winback">Win-Back</option>
              <option value="promotional">Promotional</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Target Audience
            </label>
            <select
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="all">All Users (14 emails - Disable AI or upgrade OpenAI)</option>
              <option value="vip_users">VIP Customers (3 emails - Safe for free tier!)</option>
              <option value="new_users">New Users</option>
              <option value="active_users">Active Users (7 emails)</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={formData.personalizeContent}
                onChange={(e) => setFormData({ ...formData, personalizeContent: e.target.checked })}
              />
              <span>Enable AI-powered personalization</span>
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Schedule For (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledFor}
              onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          {error && (
            <div style={{ padding: '1rem', background: '#fee', color: '#c33', borderRadius: '4px', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Campaign'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => navigate({ to: '/campaigns' })}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

