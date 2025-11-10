import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { fetchUsers, type User } from '../lib/api'

export const Route = createFileRoute('/users')({
  component: Users,
})

function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUsers() {
      setLoading(true)
      const data = await fetchUsers()
      setUsers(data)
      setLoading(false)
    }
    loadUsers()
  }, [])

  const getUserSegment = (metadata: string) => {
    try {
      const meta = JSON.parse(metadata)
      if (meta.vipStatus) return 'VIP Customer'
      
      const signupDate = new Date(meta.signupDate)
      const daysSinceSignup = (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceSignup <= 30) return 'New Signup'
      
      const lastActiveDate = new Date(meta.lastActiveDate)
      const daysSinceActive = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceActive <= 30) return 'Active User'
      
      return 'Inactive'
    } catch {
      return 'Unknown'
    }
  }

  const getTotalPurchases = (metadata: string) => {
    try {
      const meta = JSON.parse(metadata)
      return meta.totalPurchases || 0
    } catch {
      return 0
    }
  }

  if (loading) {
    return <div>Loading users...</div>
  }

  return (
    <div>
      <h1>👥 User Management</h1>

      {users.length === 0 ? (
        <>
          <div className="card" style={{ marginBottom: '2rem', padding: '2rem', background: '#f0f9ff', border: '1px solid #0ea5e9' }}>
            <h2 style={{ color: '#0369a1', marginTop: 0 }}>📝 Setup Required</h2>
            <p style={{ color: '#0c4a6e', marginBottom: '1rem' }}>
              To manage users and send campaigns, you need to add users to your Appwrite database.
            </p>
            <h3 style={{ color: '#0369a1', fontSize: '1.1rem', marginTop: '1.5rem' }}>How to add users:</h3>
            <ol style={{ color: '#0c4a6e', lineHeight: '1.8' }}>
              <li>Run the populate script: <code style={{ background: '#e0e0e0', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>npx tsx script/populate-users.ts</code></li>
              <li>Or manually add via Appwrite Console → <strong>Database</strong> → <strong>email-marketing-db</strong> → <strong>Users</strong> table</li>
            </ol>
          </div>

          <div className="card">
            <h2>User List</h2>
            <p style={{ color: '#666', marginTop: '1rem' }}>
              No users in the database yet. Run the populate script or add users manually.
            </p>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card">
              <h3>Total Users</h3>
              <p style={{ fontSize: '2rem', color: '#0066cc' }}>{users.length}</p>
            </div>
            <div className="card">
              <h3>Active Users</h3>
              <p style={{ fontSize: '2rem', color: '#0066cc' }}>
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
            <div className="card">
              <h3>VIP Customers</h3>
              <p style={{ fontSize: '2rem', color: '#0066cc' }}>
                {users.filter(u => getUserSegment(u.metadata) === 'VIP Customer').length}
              </p>
            </div>
            <div className="card">
              <h3>New Signups (30d)</h3>
              <p style={{ fontSize: '2rem', color: '#0066cc' }}>
                {users.filter(u => getUserSegment(u.metadata) === 'New Signup').length}
              </p>
            </div>
          </div>

          <div className="card">
            <h2>User List</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Segment</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Purchases</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.$id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>
                      {user.firstName} {user.lastName}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{user.email}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        background: getUserSegment(user.metadata) === 'VIP Customer' ? '#fef3c7' : 
                                   getUserSegment(user.metadata) === 'New Signup' ? '#dbeafe' :
                                   getUserSegment(user.metadata) === 'Active User' ? '#dcfce7' : '#f3f4f6',
                        color: getUserSegment(user.metadata) === 'VIP Customer' ? '#92400e' : 
                               getUserSegment(user.metadata) === 'New Signup' ? '#1e40af' :
                               getUserSegment(user.metadata) === 'Active User' ? '#166534' : '#6b7280'
                      }}>
                        {getUserSegment(user.metadata)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        color: user.status === 'active' ? '#166534' : '#dc2626'
                      }}>
                        {user.status === 'active' ? '✓ Active' : '✗ Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{getTotalPurchases(user.metadata)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {user.$createdAt ? new Date(user.$createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

