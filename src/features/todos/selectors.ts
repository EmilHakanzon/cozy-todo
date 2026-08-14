import { getChildren, sortByPosition } from './todo-tree'
import type { Todo, TodoById, TodoId, TodoListId } from './types'

export type TodoProgress = {
  total: number
  completed: number
}

export function getRootTodos(todosById: TodoById, listId: TodoListId): Todo[] {
  return sortByPosition(
    Object.values(todosById).filter((todo) => todo.listId === listId && todo.parentId === null)
  )
}

/**
 * Osorterad med flit: listan spänner över flera föräldrar, och position är bara
 * definierad bland syskon. En global sortering skulle antyda en ordning som
 * domänen inte har.
 */
export function getTodosForList(todosById: TodoById, listId: TodoListId): Todo[] {
  return Object.values(todosById).filter((todo) => todo.listId === listId)
}

export function getActiveTodos(todos: Todo[]): Todo[] {
  return todos.filter((todo) => todo.completedAt === null)
}

export function getCompletedTodos(todos: Todo[]): Todo[] {
  return todos.filter((todo) => todo.completedAt !== null)
}

/**
 * Räknar bara direkta barn — inte hela subträdet. "2 of 4 completed" på en
 * förälder ska matcha raderna man faktiskt ser under den.
 */
export function getTodoProgress(todosById: TodoById, parentId: TodoId): TodoProgress {
  const children = getChildren(todosById, parentId)

  return {
    total: children.length,
    completed: getCompletedTodos(children).length,
  }
}


export function getTodoCountForList(
  todosById:TodoById,
  listId: TodoListId,
): number {
  return Object.values(todosById).filter((todo) => 
  todo.listId === listId &&
todo.parentId === null,).length;
}