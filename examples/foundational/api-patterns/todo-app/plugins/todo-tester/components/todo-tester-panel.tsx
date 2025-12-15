import React, { useState, useEffect, useCallback } from 'react'

type Todo = {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'archived'
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
  completedAt?: string
}

type Stats = {
  total: number
  pending: number
  inProgress: number
  completed: number
  archived: number
}

const API_BASE = 'http://localhost:3000'

export function TodoTesterPanel() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Create form
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  
  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // View
  const [activeView, setActiveView] = useState<'list' | 'stats'>('list')

  const fetchTodos = useCallback(async () => {
    try {
      const url = statusFilter === 'all' 
        ? `${API_BASE}/todos` 
        : `${API_BASE}/todos?status=${statusFilter}`
      const res = await fetch(url)
      const data = await res.json()
      setTodos(data.todos || [])
    } catch (err) {
      console.error('Failed to fetch todos')
    }
  }, [statusFilter])

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/todo-stats`)
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats')
    }
  }

  useEffect(() => {
    fetchTodos()
    fetchStats()
  }, [fetchTodos])

  const createTodo = async () => {
    if (!newTitle.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || undefined,
          priority: newPriority,
        }),
      })
      if (res.ok) {
        setNewTitle('')
        setNewDescription('')
        setNewPriority('medium')
        setShowCreateForm(false)
        fetchTodos()
        fetchStats()
      }
    } catch (err) {
      console.error('Failed to create todo')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: Todo['status']) => {
    try {
      await fetch(`${API_BASE}/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchTodos()
      fetchStats()
    } catch (err) {
      console.error('Failed to update todo')
    }
  }

  const updateTodo = async (id: string) => {
    if (!editTitle.trim()) return
    try {
      await fetch(`${API_BASE}/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || undefined,
        }),
      })
      setEditingId(null)
      fetchTodos()
    } catch (err) {
      console.error('Failed to update todo')
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      await fetch(`${API_BASE}/todos/${id}`, { method: 'DELETE' })
      fetchTodos()
      fetchStats()
    } catch (err) {
      console.error('Failed to delete todo')
    }
  }

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditDescription(todo.description || '')
  }

  const getPriorityColor = (p: string) => {
    if (p === 'high') return 'text-red-400'
    if (p === 'medium') return 'text-yellow-400'
    return 'text-green-400'
  }

  const getPriorityDot = (p: string) => {
    if (p === 'high') return '🔴'
    if (p === 'medium') return '🟡'
    return '🟢'
  }

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (a.status !== 'completed' && b.status === 'completed') return -1
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">Inbox</h1>
            {stats && (
              <p className="text-xs text-zinc-500">{stats.completed} of {stats.total} completed</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('list')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                activeView === 'list' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              📋 List
            </button>
            <button
              onClick={() => setActiveView('stats')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                activeView === 'stats' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              📊 Stats
            </button>
          </div>
        </div>

        {/* Filters */}
        {activeView === 'list' && (
          <div className="flex items-center gap-1 flex-wrap">
            {['all', 'pending', 'in_progress', 'completed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  statusFilter === s 
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                    : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeView === 'list' ? (
          <div className="p-4">
            {/* Quick Add */}
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full p-3 mb-4 border border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-sm"
              >
                + Add new todo
              </button>
            ) : (
              <div className="mb-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full px-3 py-2 mb-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 mb-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                  rows={2}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-500 mr-2">Priority:</span>
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setNewPriority(p)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          newPriority === p
                            ? p === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : p === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                            : 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                        }`}
                      >
                        {getPriorityDot(p)} {p}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createTodo}
                      disabled={loading || !newTitle.trim()}
                      className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {loading ? 'Adding...' : 'Add Todo'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Todo List */}
            {sortedTodos.length === 0 ? (
              <div className="text-center py-8 text-zinc-600">
                <p>No todos found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {sortedTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="group flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-900/50 transition-colors"
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => updateStatus(todo.id, todo.status === 'completed' ? 'pending' : 'completed')}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        todo.status === 'completed'
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-zinc-600 hover:border-indigo-500'
                      }`}
                    >
                      {todo.status === 'completed' && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Content */}
                    {editingId === todo.id ? (
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-indigo-500"
                          autoFocus
                        />
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                          rows={2}
                          placeholder="Description"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTodo(todo.id)}
                            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${todo.status === 'completed' ? 'line-through text-zinc-500' : 'text-white'}`}>
                            {todo.title}
                          </span>
                          <span className={`text-xs ${getPriorityColor(todo.priority)}`}>
                            {todo.priority === 'high' && '● urgent'}
                          </span>
                          {todo.status === 'in_progress' && (
                            <span className="text-xs text-blue-400">● in progress</span>
                          )}
                        </div>
                        {todo.description && (
                          <p className="text-xs text-zinc-500 mt-0.5">{todo.description}</p>
                        )}
                      </div>
                    )}

                    {/* Priority dot */}
                    <span className="text-sm opacity-50" title={todo.priority}>
                      {getPriorityDot(todo.priority)}
                    </span>

                    {/* Actions */}
                    {!editingId && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {todo.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(todo.id, 'in_progress')}
                            className="p-1 text-blue-400 hover:bg-blue-500/20 rounded"
                            title="Start"
                          >
                            ▶
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(todo)}
                          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Stats View */
          <div className="p-4 space-y-4">
            {stats ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs text-zinc-500">Total</div>
                  </div>
                  <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                    <div className="text-2xl font-bold text-orange-400">{stats.pending}</div>
                    <div className="text-xs text-orange-400/70">Pending</div>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
                    <div className="text-xs text-blue-400/70">In Progress</div>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                    <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
                    <div className="text-xs text-green-400/70">Completed</div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">Completion Rate</span>
                    <span className="text-lg font-bold text-indigo-400">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="text-sm text-zinc-400 mb-2">Archived</div>
                  <div className="text-2xl font-bold text-zinc-500">{stats.archived}</div>
                </div>

                <button
                  onClick={() => { fetchStats(); fetchTodos() }}
                  className="w-full py-2 text-sm text-zinc-400 hover:text-white bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  🔄 Refresh Stats
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {activeView === 'list' && stats && stats.total > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-3">
              <span>⏳ {stats.pending}</span>
              <span>🔄 {stats.inProgress}</span>
              <span>✅ {stats.completed}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500"
                  style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                />
              </div>
              <span>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TodoTesterPanel
