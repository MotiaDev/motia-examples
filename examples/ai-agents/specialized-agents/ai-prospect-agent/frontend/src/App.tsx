import { useState, useEffect, useRef } from 'react'
import './App.css'

interface Prospect {
  id: string
  company_name: string
  contact_name?: string
  first_name?: string
  last_name?: string
  email: string
  title?: string
  industry?: string
  fit_score?: number
  buying_intent_score?: number
  email_subject?: string
  email_draft?: string
  research_status?: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const scoreColor = (prospect.fit_score || 0) >= 80 ? '#22c55e' : 
                     (prospect.fit_score || 0) >= 60 ? '#eab308' : '#ef4444'
  
  return (
    <div className="prospect-card">
      <div className="prospect-header">
        <h3>{prospect.company_name}</h3>
        {prospect.fit_score !== undefined && (
          <span className="score" style={{ backgroundColor: scoreColor }}>
            {prospect.fit_score}
          </span>
        )}
      </div>
      <p className="contact">
        {prospect.contact_name || `${prospect.first_name} ${prospect.last_name}`}
        {prospect.title && ` • ${prospect.title}`}
      </p>
      <p className="email">{prospect.email}</p>
      {prospect.industry && <span className="industry">{prospect.industry}</span>}
      {prospect.research_status && (
        <span className={`status status-${prospect.research_status}`}>
          {prospect.research_status}
        </span>
      )}
    </div>
  )
}

function ChatSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "👋 Hi! I'm ProspectAI. Ask me things like:\n\n• Who should I call this week?\n• Show me high-score prospects\n• Draft an email for the top prospect" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch('http://localhost:3000/api/copilot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })

      if (response.ok) {
        const data = await response.json()
        let assistantMessage = data.answer || 'No response'
        
        if (data.recommendations?.length > 0) {
          assistantMessage += '\n\n**Recommendations:**\n' + data.recommendations.map((r: string) => `• ${r}`).join('\n')
        }
        
        if (data.prospects?.length > 0) {
          assistantMessage += '\n\n**Top Prospects:**\n' + data.prospects.map((p: any) => 
            `• ${p.company_name} (Score: ${p.fit_score}) - ${p.reason}`
          ).join('\n')
        }

        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ Sorry, I encountered an error. Please try again.' }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Failed to connect to the server.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="chat-overlay" onClick={onClose}>
      <div className="chat-sidebar" onClick={e => e.stopPropagation()}>
        <div className="chat-header">
          <h2>🎯 ProspectAI Assistant</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-content">
                {msg.content.split('\n').map((line, i) => (
                  <span key={i}>
                    {line.startsWith('**') && line.endsWith('**') 
                      ? <strong>{line.slice(2, -2)}</strong>
                      : line}
                    {i < msg.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-content typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about prospects..."
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const fetchProspects = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/prospects')
      if (response.ok) {
        const data = await response.json()
        setProspects(data.prospects || [])
      }
    } catch (err) {
      setError('Failed to fetch prospects')
    } finally {
      setLoading(false)
    }
  }

  const fetchTopProspects = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/prospects/top?limit=20')
      if (response.ok) {
        const data = await response.json()
        setProspects(data.prospects || [])
      }
    } catch (err) {
      setError('Failed to fetch top prospects')
    }
  }

  useEffect(() => {
    fetchProspects()
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const csv_data = e.target?.result as string
        const response = await fetch('http://localhost:3000/api/prospects/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv_data, filename: file.name })
        })
        
        if (response.ok) {
          const data = await response.json()
          alert(`✅ Uploaded ${data.total_prospects} prospects!\nBatch ID: ${data.batch_id}`)
          fetchProspects()
        } else {
          const err = await response.json()
          alert(`❌ Upload failed: ${err.error}`)
        }
      } catch (err) {
        alert('❌ Upload failed')
      } finally {
        setUploading(false)
      }
    }
    
    reader.readAsText(file)
  }

  return (
    <div className="app">
      <div className="dashboard">
        <header className="header">
          <div className="header-content">
            <h1>🎯 ProspectAI</h1>
            <p>AI-Powered Sales Intelligence</p>
          </div>
          <div className="header-actions">
            <label className="upload-btn">
              {uploading ? 'Uploading...' : '📤 Upload CSV'}
              <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading} />
            </label>
            <button onClick={fetchTopProspects} className="btn-primary">
              🏆 Top Prospects
            </button>
            <button onClick={fetchProspects} className="btn-secondary">
              🔄 Refresh
            </button>
            <button onClick={() => setChatOpen(true)} className="btn-chat">
              💬 AI Assistant
            </button>
          </div>
        </header>

        <main className="main">
          {loading ? (
            <div className="loading">Loading prospects...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : prospects.length === 0 ? (
            <div className="empty">
              <h2>No prospects yet</h2>
              <p>Upload a CSV file to get started!</p>
            </div>
          ) : (
            <div className="prospects-grid">
              {prospects.map((prospect) => (
                <ProspectCard key={prospect.id} prospect={prospect} />
              ))}
            </div>
          )}
        </main>

        <footer className="footer">
          <p>Powered by Motia • {prospects.length} prospects loaded</p>
        </footer>
      </div>

      <ChatSidebar isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}

export default App
