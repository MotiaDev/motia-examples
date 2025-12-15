import { Todo, CreateTodoInput, UpdateTodoInput, TodoStatus } from './types'

/**
 * In-memory todo storage for demo purposes.
 * In production, you would use a database like PostgreSQL, MongoDB, etc.
 */
const todos: Map<string, Todo> = new Map()

/**
 * Generate a unique ID for todos
 */
function generateId(): string {
  return `todo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Todo Service - Handles all todo-related business logic
 */
export const todoService = {
  /**
   * Create a new todo
   */
  async create(input: CreateTodoInput): Promise<Todo> {
    const id = generateId()
    const now = new Date().toISOString()

    const todo: Todo = {
      id,
      title: input.title,
      description: input.description,
      status: 'pending',
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now,
    }

    todos.set(id, todo)
    return todo
  },

  /**
   * Get a todo by ID
   */
  async getById(id: string): Promise<Todo | null> {
    return todos.get(id) ?? null
  },

  /**
   * Get all todos with optional status filter
   */
  async getAll(status?: TodoStatus): Promise<Todo[]> {
    const allTodos = Array.from(todos.values())

    if (status) {
      return allTodos.filter((todo) => todo.status === status)
    }

    return allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  /**
   * Update a todo
   */
  async update(id: string, input: UpdateTodoInput): Promise<Todo | null> {
    const existing = todos.get(id)

    if (!existing) {
      return null
    }

    const now = new Date().toISOString()
    const updated: Todo = {
      ...existing,
      ...input,
      updatedAt: now,
    }

    // Set completedAt when status changes to completed
    if (input.status === 'completed' && existing.status !== 'completed') {
      updated.completedAt = now
    }

    // Remove completedAt if status changes from completed
    if (input.status && input.status !== 'completed' && existing.status === 'completed') {
      updated.completedAt = undefined
    }

    todos.set(id, updated)
    return updated
  },

  /**
   * Delete a todo
   */
  async delete(id: string): Promise<Todo | null> {
    const existing = todos.get(id)

    if (!existing) {
      return null
    }

    todos.delete(id)
    return existing
  },

  /**
   * Get todos completed before a certain date
   * Used by the cleanup cron job
   */
  async getCompletedBefore(date: Date): Promise<Todo[]> {
    const allTodos = Array.from(todos.values())

    return allTodos.filter((todo) => {
      if (todo.status !== 'completed' || !todo.completedAt) {
        return false
      }

      return new Date(todo.completedAt) < date
    })
  },

  /**
   * Archive old completed todos
   * Used by the cleanup cron job
   */
  async archiveCompleted(todoIds: string[]): Promise<number> {
    let count = 0

    for (const id of todoIds) {
      const todo = todos.get(id)
      if (todo && todo.status === 'completed') {
        todo.status = 'archived'
        todo.updatedAt = new Date().toISOString()
        todos.set(id, todo)
        count++
      }
    }

    return count
  },

  /**
   * Get statistics about todos
   */
  async getStats(): Promise<{
    total: number
    pending: number
    inProgress: number
    completed: number
    archived: number
  }> {
    const allTodos = Array.from(todos.values())

    return {
      total: allTodos.length,
      pending: allTodos.filter((t) => t.status === 'pending').length,
      inProgress: allTodos.filter((t) => t.status === 'in_progress').length,
      completed: allTodos.filter((t) => t.status === 'completed').length,
      archived: allTodos.filter((t) => t.status === 'archived').length,
    }
  },
}

