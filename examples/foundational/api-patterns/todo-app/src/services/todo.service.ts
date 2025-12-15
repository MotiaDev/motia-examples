import { Todo, CreateTodoInput, UpdateTodoInput, TodoStatus } from './todo-types'

/**
 * Generate a unique ID for todos
 */
function generateId(): string {
  return `todo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Todo Service - Handles all todo-related business logic
 * Uses Motia's state management for persistence across step executions
 */
export const todoService = {
  /**
   * Create a new todo (requires state from context)
   */
  async create(input: CreateTodoInput, state: any): Promise<Todo> {
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

    await state.set('todos', id, todo)
    return todo
  },

  /**
   * Get a todo by ID
   */
  async getById(id: string, state: any): Promise<Todo | null> {
    return await state.get<Todo>('todos', id)
  },

  /**
   * Get all todos with optional status filter
   */
  async getAll(state: any, status?: TodoStatus): Promise<Todo[]> {
    const allTodos = await state.getGroup<Todo>('todos')

    if (status) {
      return allTodos.filter((todo) => todo.status === status)
    }

    return allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  /**
   * Update a todo
   */
  async update(id: string, input: UpdateTodoInput, state: any): Promise<Todo | null> {
    const existing = await state.get<Todo>('todos', id)

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

    await state.set('todos', id, updated)
    return updated
  },

  /**
   * Delete a todo
   */
  async delete(id: string, state: any): Promise<Todo | null> {
    const existing = await state.get<Todo>('todos', id)

    if (!existing) {
      return null
    }

    await state.delete('todos', id)
    return existing
  },

  /**
   * Get todos completed before a certain date
   * Used by the cleanup cron job
   */
  async getCompletedBefore(date: Date, state: any): Promise<Todo[]> {
    const allTodos = await state.getGroup<Todo>('todos')

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
  async archiveCompleted(todoIds: string[], state: any): Promise<number> {
    let count = 0

    for (const id of todoIds) {
      const todo = await state.get<Todo>('todos', id)
      if (todo && todo.status === 'completed') {
        todo.status = 'archived'
        todo.updatedAt = new Date().toISOString()
        await state.set('todos', id, todo)
        count++
      }
    }

    return count
  },

  /**
   * Get statistics about todos
   */
  async getStats(state: any): Promise<{
    total: number
    pending: number
    inProgress: number
    completed: number
    archived: number
  }> {
    const allTodos = await state.getGroup<Todo>('todos')

    return {
      total: allTodos.length,
      pending: allTodos.filter((t) => t.status === 'pending').length,
      inProgress: allTodos.filter((t) => t.status === 'in_progress').length,
      completed: allTodos.filter((t) => t.status === 'completed').length,
      archived: allTodos.filter((t) => t.status === 'archived').length,
    }
  },
}
