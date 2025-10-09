import { API_URL } from '../constants'

export type Todo = {
  id: string
  description: string
  createdAt: string
  dueDate?: string
  completedAt?: string
}

export const useTodoEndpoints = () => {
  const createTodo = async (description: string) => {
    await fetch(`${API_URL}/todo`, {
      method: 'POST',
      body: JSON.stringify({ description }),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const updateTodo = async (id: string, args: { description?: string; checked?: boolean }) => {
    await fetch(`${API_URL}/todo/${id}`, {
      method: 'PUT',
      body: JSON.stringify(args),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const deleteTodo = async (id: string) => {
    await fetch(`${API_URL}/todo/${id}`, { method: 'DELETE' })
  }

  return { createTodo, updateTodo, deleteTodo }
}
