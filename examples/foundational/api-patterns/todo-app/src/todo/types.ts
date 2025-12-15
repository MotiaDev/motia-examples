import { z } from 'zod'

// Todo status enum
export const todoStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'archived'])

// Todo priority enum
export const todoPrioritySchema = z.enum(['low', 'medium', 'high'])

// Base todo schema
export const todoSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title cannot be empty'),
  description: z.string().optional(),
  status: todoStatusSchema,
  priority: todoPrioritySchema,
  dueDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
})

// Schema for creating a todo
export const createTodoSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  description: z.string().optional(),
  priority: todoPrioritySchema.optional().default('medium'),
  dueDate: z.string().optional(),
})

// Schema for updating a todo
export const updateTodoSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().optional(),
  status: todoStatusSchema.optional(),
  priority: todoPrioritySchema.optional(),
  dueDate: z.string().optional(),
})

// Types derived from schemas
export type Todo = z.infer<typeof todoSchema>
export type TodoStatus = z.infer<typeof todoStatusSchema>
export type TodoPriority = z.infer<typeof todoPrioritySchema>
export type CreateTodoInput = z.infer<typeof createTodoSchema>
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>

