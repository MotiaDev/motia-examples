import { cn, Input } from '@motiadev/ui'
import { CheckIcon, TrashIcon, XIcon } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import type { Todo } from '../hook/useTodoEndpoints'
import { Checkbox } from './Checkbox'
import { IconButton } from './IconButton'

type Props = {
  todo: Todo
  handleToggleTodo: (todo: Todo) => void
  handleUpdateTodo: (id: string, description: string) => void
  handleDeleteTodo: (id: string) => void
  isDeleting: boolean
  isUpdating: boolean
}

export const TodoItem: React.FC<Props> = ({
  todo,
  handleToggleTodo,
  handleUpdateTodo,
  handleDeleteTodo,
  isDeleting,
  isUpdating,
}: Props) => {
  const [editedDescription, setEditedDescription] = useState(todo.description)
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = () => {
    handleUpdateTodo(todo.id, editedDescription)
    setIsEditing(false)
  }
  const handleCancel = () => {
    setEditedDescription(todo.description)
    setIsEditing(false)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 font-medium text-lg">
      <div className="flex items-center justify-center h-6 w-6 cursor-pointer">
        <Checkbox checked={!!todo.completedAt} onChange={() => handleToggleTodo(todo)} />
      </div>
      {isEditing ? (
        <div className="flex items-center gap-2 flex-1 max-w-full overflow-x-auto">
          <Input
            autoFocus
            className="flex-1  whitespace-nowrap"
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>
      ) : (
        <p
          onDoubleClick={() => setIsEditing(true)}
          className={cn(
            'truncate',
            todo.completedAt && 'line-through text-muted-foreground',
            isUpdating && 'animate-pulse',
          )}
        >
          {todo.description}
        </p>
      )}

      {isEditing ? (
        <>
          <IconButton onClick={handleSave}>
            <CheckIcon className="size-3" />
          </IconButton>
          <IconButton onClick={handleCancel}>
            <XIcon className="size-3" />
          </IconButton>
        </>
      ) : (
        <IconButton onClick={() => handleDeleteTodo(todo.id)} disabled={isDeleting}>
          <TrashIcon className="size-3" />
        </IconButton>
      )}
    </div>
  )
}
