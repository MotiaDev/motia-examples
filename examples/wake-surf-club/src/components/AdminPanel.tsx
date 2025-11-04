import React, { useState, useEffect } from 'react'
import { Users, Calendar, Settings, Plus, Edit, Trash2, Send, Download } from 'lucide-react'
import { format, parseISO, addDays } from 'date-fns'
import EnhancedCalendar from './EnhancedCalendar'
import { loadSessionsFromAPI, SessionInfo, Session } from '../utils/sessionData'

interface Friend {
  id: string
  name: string
  phone: string
  phoneE164: string
  active: boolean
  createdAt: string
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'sessions' | 'settings'>('sessions')
  const [friends, setFriends] = useState<Friend[]>([])
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null)
  
  // User management state
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<Friend | null>(null)
  const [newUser, setNewUser] = useState({ name: '', phone: '' })

  useEffect(() => {
    loadFriends()
    loadSessions()
  }, [])

  const showToast = (message: string, type: 'success' | 'error') => {
    console.log('Showing toast:', message, type)
    setToast({ message, type })
    setTimeout(() => {
      console.log('Auto-hiding toast')
      setToast(null)
    }, 5000) // Auto-hide after 5 seconds
  }

  const loadFriends = async (retryCount = 0) => {
    try {
      const response = await fetch('/admin/friends')
      if (response.ok) {
        const data = await response.json()
        setFriends(data.friends || [])
      } else {
        console.log('Failed to load friends:', response.status)
        setFriends([]) // Set empty array on failure
      }
    } catch (err) {
      console.log('Error loading friends:', err)
      // If backend isn't ready yet, retry after a delay
      if (retryCount < 3) {
        setTimeout(() => {
          loadFriends(retryCount + 1)
        }, 1000) // Wait 1 second before retry
      } else {
        showToast('Backend is not responding. Please check if the server is running.', 'error')
        setFriends([]) // Set empty array on final failure
      }
    }
  }

  const loadSessions = async (retryCount = 0) => {
    try {
      const sessionsInfo = await loadSessionsFromAPI()
      setSessions(sessionsInfo)
    } catch (err) {
      console.log('Error loading sessions:', err)
      // If backend isn't ready yet, retry after a delay
      if (retryCount < 3) {
        setTimeout(() => {
          loadSessions(retryCount + 1)
        }, 1000) // Wait 1 second before retry
      } else {
        showToast('Backend is not responding. Please check if the server is running.', 'error')
        setSessions([]) // Set empty array on final failure
      }
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.name || !newUser.phone) return

    try {
      const response = await fetch('/admin/friends/import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          friends: [newUser]
        })
      })

      if (response.ok) {
        setNewUser({ name: '', phone: '' })
        setShowAddUser(false)
        loadFriends()
      }
    } catch (err) {
      showToast('Failed to add user', 'error')
    }
  }

  const handleDeleteUser = async (friendId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const response = await fetch(`/admin/friends/${friendId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadFriends()
      }
    } catch (err) {
      showToast('Failed to delete user', 'error')
    }
  }

  const handleSendInvites = async () => {
    try {
      const response = await fetch('/admin/invite/send', {
        method: 'POST'
      })

      if (response.ok) {
        alert('Invites sent successfully!')
      }
    } catch (err) {
      showToast('Failed to send invites', 'error')
    }
  }


  // Calendar handlers
  const handleSessionCreate = async (date: string) => {
    try {
      setLoading(true)

      const response = await fetch('/admin/session/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date,
          startTime: '07:00',
          endTime: '09:00',
          capacity: 3,
          status: 'published'
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Session created:', data)
        showToast(`Session created successfully for ${date}!`, 'success')
        // Refresh the sessions list
        await loadSessions()
      } else {
        const errorData = await response.json()
        showToast(errorData.error || 'Failed to create session', 'error')
      }
    } catch (err) {
      showToast('Failed to create session', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSessionEdit = async (session: Session) => {
    try {
      // This would open an edit modal or navigate to edit page
      alert(`Editing session for ${session.date}. This would integrate with your session edit API.`)
    } catch (err) {
      showToast('Failed to edit session', 'error')
    }
  }

  const handleSessionDelete = async (sessionId: string) => {
    try {
      // This would call an API to delete the session
      alert(`Deleting session ${sessionId}. This would integrate with your session deletion API.`)
      loadSessions()
    } catch (err) {
      showToast('Failed to delete session', 'error')
    }
  }

  const handleBookingCancel = async (bookingId: string) => {
    try {
      // This would call an API to cancel the booking
      alert(`Canceling booking ${bookingId}. This would integrate with your booking cancellation API.`)
      loadSessions()
    } catch (err) {
      showToast('Failed to cancel booking', 'error')
    }
  }

  const handleBookingCreate = async (sessionId: string) => {
    try {
      setLoading(true)

      // For demo purposes, we'll use a demo friend
      const response = await fetch('/api/book/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          friendName: 'Demo Friend',
          phoneE164: '+15551234567'
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Booking response:', data) // Debug log
        
        // Handle different response statuses
        switch (data.status) {
          case 'confirmed':
            showToast(data.message || 'Successfully booked! You will receive a confirmation SMS.', 'success')
            loadSessions() // Refresh to show updated booking count
            break
            
          case 'already_booked':
            showToast(data.message || 'You are already booked for this session!', 'error')
            break
            
          case 'full':
            showToast(data.message || 'Sorry, this session is full.', 'error')
            break
            
          case 'waitlisted':
            showToast(data.message || 'You are on the waitlist for this session.', 'success')
            loadSessions() // Refresh to show updated booking count
            break
            
          default:
            showToast('Unknown booking status received.', 'error')
        }
      } else {
        const errorData = await response.json()
        showToast(errorData.error || 'Booking failed', 'error')
      }
    } catch (err) {
      showToast('Booking failed. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const formatPhone = (phone: string) => {
    // Format phone number for display
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Wake Surf Club Admin</h1>
              <p className="text-gray-600">Manage your wake surfing sessions</p>
            </div>
          </div>
        </div>
      </div>


      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'users', label: 'Users', icon: Users },
              { id: 'sessions', label: 'Sessions', icon: Calendar },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Friends Management</h2>
              <button
                onClick={() => setShowAddUser(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Friend</span>
              </button>
            </div>

            {/* Add User Modal */}
            {showAddUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">Add New Friend</h3>
                  <form onSubmit={handleAddUser}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={newUser.name}
                          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={newUser.phone}
                          onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="(555) 123-4567"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowAddUser(false)}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Add Friend
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Friends List */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {friends && friends.length > 0 ? friends.map((friend) => (
                    <tr key={friend.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {friend.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPhone(friend.phone)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          friend.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {friend.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(parseISO(friend.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => setEditingUser(friend)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(friend.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No friends found. Add some friends to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Session Management</h2>
              <div className="flex space-x-4">
                <button
                  onClick={handleSendInvites}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Invites</span>
                </button>
              </div>
            </div>
            
            {/* Calendar */}
            <EnhancedCalendar
              sessions={sessions}
              mode="admin"
              onSessionCreate={handleSessionCreate}
              onSessionEdit={handleSessionEdit}
              onSessionDelete={handleSessionDelete}
              onBookingCreate={handleBookingCreate}
              onBookingCancel={handleBookingCancel}
              loading={loading}
            />

            {/* Quick Stats */}
            {sessions && sessions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2">Total Sessions</h3>
                  <p className="text-3xl font-bold text-blue-600">{sessions.length}</p>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2">Total Bookings</h3>
                  <p className="text-3xl font-bold text-green-600">
                    {sessions.reduce((total, session) => total + (session.bookings?.length || 0), 0)}
                  </p>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2">Active Friends</h3>
                  <p className="text-3xl font-bold text-purple-600">
                    {friends ? friends.filter(f => f.active).length : 0}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            
            {/* Session Configuration */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Session Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Capacity
                  </label>
                  <input
                    type="number"
                    defaultValue="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Time
                  </label>
                  <input
                    type="text"
                    defaultValue="7:00 AM - 9:00 AM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="Lake location or address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] transform transition-all duration-300 ease-in-out">
          <div className={`px-6 py-4 rounded-lg shadow-xl max-w-sm border-l-4 ${
            toast.type === 'success' 
              ? 'bg-green-50 text-green-800 border-green-500' 
              : 'bg-red-50 text-red-800 border-red-500'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="font-medium">{toast.message}</span>
              </div>
              <button 
                onClick={() => setToast(null)}
                className="ml-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
