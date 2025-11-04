import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import AdminPanel from './components/AdminPanel'
import UserInterface from './components/UserInterface'
import CalendarView from './components/CalendarView'

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <nav style={{ 
          background: 'white', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '0 20px'
        }}>
          <div style={{ 
            maxWidth: '1200px', 
            margin: '0 auto', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            height: '64px' 
          }}>
            <Link 
              to="/" 
              style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold', 
                color: '#2d3748',
                textDecoration: 'none'
              }}
            >
              Wake Surf Club
            </Link>
            <Link 
              to="/admin" 
              style={{ 
                color: '#718096', 
                padding: '8px 16px', 
                borderRadius: '6px', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#2d3748'
                e.target.style.backgroundColor = '#f7fafc'
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#718096'
                e.target.style.backgroundColor = 'transparent'
              }}
            >
              Admin
            </Link>
          </div>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<UserInterface />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/book" element={<BookSession />} />
            <Route path="/cancel" element={<CancelSession />} />
            <Route path="/session/next" element={<NextSession />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function BookSession() {
  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Book Your Session</h1>
        <p className="subtitle">
          This page would normally be accessed via a signed link in your SMS invite.
        </p>
        <div className="message info">
          <p>
            <strong>Note:</strong> In a real implementation, this would be a signed link that automatically 
            identifies the friend and allows them to book with one click.
          </p>
        </div>
      </div>
    </div>
  )
}

function CancelSession() {
  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Cancel Your Booking</h1>
        <p className="subtitle">
          This page would normally be accessed via a signed link in your confirmation SMS.
        </p>
        <div className="message info">
          <p>
            <strong>Note:</strong> In a real implementation, this would be a signed link that automatically 
            identifies the friend and allows them to cancel their booking.
          </p>
        </div>
      </div>
    </div>
  )
}

function NextSession() {
  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Next Session Info</h1>
        <p className="subtitle">
          This would show information about upcoming sessions.
        </p>
        <div className="message info">
          <p>
            <strong>API Endpoint:</strong> This would call /api/sessions to get session details.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App