import { Button } from '@motiadev/ui'
import { useState } from 'react'
import { useStreamGroup } from '@motiadev/stream-client-react'

import { useTodoEndpoints, type Todo } from './hook/useTodoEndpoints'
import { TodoItem } from './components/TodoItem'

import '@motiadev/ui/globals.css'
import '@motiadev/ui/styles.css'

function App() {
  const { createTodo, updateTodo, deleteTodo } = useTodoEndpoints()
  const { data: todos } = useStreamGroup<Todo>({ groupId: 'inbox', streamName: 'todo' })

  const [newTodo, setNewTodo] = useState('')
  const [deletingTodoIds, setDeletingTodoIds] = useState<string[]>([])
  const [updatingTodoIds, setUpdatingTodoIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

  const handleAddTodo = async (description: string) => {
    setIsCreating(true)
    try {
      await createTodo(description)
      setNewTodo('')
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleTodo = async (todo: Todo) => {
    setUpdatingTodoIds((prev) => [...prev, todo.id])
    try {
      await updateTodo(todo.id, { checked: !todo.completedAt })
    } finally {
      setUpdatingTodoIds((prev) => prev.filter((id) => id !== todo.id))
    }
  }

  const handleDeleteTodo = async (id: string) => {
    setDeletingTodoIds((prev) => [...prev, id])
    try {
      await deleteTodo(id)
    } finally {
      setDeletingTodoIds((prev) => prev.filter((id) => id !== id))
    }
  }

  const handleUpdateTodo = async (id: string, description: string) => {
    setUpdatingTodoIds((prev) => [...prev, id])
    try {
      await updateTodo(id, { description })
    } finally {
      setUpdatingTodoIds((prev) => prev.filter((id) => id !== id))
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTodo(newTodo)
    }
  }

  return (
    <div className="flex justify-center items-center h-screen w-screen p-4 ">
      <div className="w-full max-w-md flex flex-col gap-6">
        <h1 className="text-4xl font-bold">Inbox</h1>
        <div className="group flex flex-row gap-2 rounded-3xl border border-muted-border bg-muted p-3 transition-colors duration-150 ease-in-out relative mr-2 md:mr-0">
          <input
            className="font-medium px-2 w-full bg-transparent focus:bg-transparent outline-none text-lg focus:outline-none focus:ring-0 focus:ring-offset-0"
            placeholder="Add a new todo"
            value={newTodo}
            onKeyDown={handleInputKeyDown}
            onChange={(e) => setNewTodo(e.target.value)}
          />
          <Button className="rounded-full" onClick={() => handleAddTodo(newTodo)} disabled={isCreating}>
            Add
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {todos.length > 0 &&
            todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                handleToggleTodo={handleToggleTodo}
                handleUpdateTodo={handleUpdateTodo}
                handleDeleteTodo={handleDeleteTodo}
                isDeleting={deletingTodoIds.includes(todo.id)}
                isUpdating={updatingTodoIds.includes(todo.id)}
              />
            ))}
        </div>
      </div>
    </div>
  )
}

export default App
