import type { Todo, TodoById, TodoId } from './types'

export function sortByPosition(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => a.position - b.position)
}

/**
 * Children are not filtered by listId — a todo always lives in the same list as
 * its parent, so parentId alone identifies them.
 */
export function getChildren(todosById: TodoById, parentId: TodoId): Todo[] {
  return sortByPosition(Object.values(todosById).filter((todo) => todo.parentId === parentId))
}

export function getDescendantIds(todosById: TodoById, parentId: TodoId): TodoId[] {
  const children = getChildren(todosById, parentId)

  return children.flatMap((child) => [child.id, ...getDescendantIds(todosById, child.id)])
}

export function isDescendant(
  todosById: TodoById,
  ancestorId: TodoId,
  candidateId: TodoId,
): boolean {
  return getDescendantIds(todosById, ancestorId).includes(candidateId)
}
