import { describe, expect, it } from 'vitest'

import {
  getActiveTodos,
  getCompletedTodos,
  getRootTodos,
  getTodoProgress,
  getTodosForList,
} from './selectors'
import type { Todo, TodoById } from './types'

const HOME = 'list-home'
const PERSONAL = 'list-personal'

function makeTodo(todo: Partial<Todo> & Pick<Todo, 'id'>): Todo {
  return {
    listId: HOME,
    parentId: null,
    title: todo.id,
    notes: '',
    dueAt: null,
    completedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    position: 0,
    ...todo,
  }
}

function makeTodosById(...todos: Todo[]): TodoById {
  return Object.fromEntries(todos.map((todo) => [todo.id, todo]))
}

describe('getRootTodos', () => {
  it('tar bara root-todos i rätt lista, sorterade på position', () => {
    const todosById = makeTodosById(
      makeTodo({ id: 'b', position: 1 }),
      makeTodo({ id: 'a', position: 0 }),
      makeTodo({ id: 'barn', parentId: 'a', position: 0 }),
      makeTodo({ id: 'annan-lista', listId: PERSONAL, position: 0 })
    )

    expect(getRootTodos(todosById, HOME).map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('getTodosForList', () => {
  it('tar hela listan oavsett djup', () => {
    const todosById = makeTodosById(
      makeTodo({ id: 'a' }),
      makeTodo({ id: 'barn', parentId: 'a' }),
      makeTodo({ id: 'barnbarn', parentId: 'barn' }),
      makeTodo({ id: 'annan-lista', listId: PERSONAL })
    )

    expect(getTodosForList(todosById, HOME).map((t) => t.id).sort()).toEqual([
      'a',
      'barn',
      'barnbarn',
    ])
  })

  it('sorterar inte — ordningen från todosById behålls', () => {
    // position är bara meningsfull bland syskon, så en global sortering här
    // skulle antyda en ordning domänen inte definierar.
    const todosById = makeTodosById(
      makeTodo({ id: 'a', position: 5 }),
      makeTodo({ id: 'barn', parentId: 'a', position: 0 })
    )

    expect(getTodosForList(todosById, HOME).map((t) => t.id)).toEqual(['a', 'barn'])
  })
})

describe('getActiveTodos / getCompletedTodos', () => {
  const active = makeTodo({ id: 'active' })
  const done = makeTodo({ id: 'done', completedAt: '2026-01-02T00:00:00.000Z' })

  it('delar upp på completedAt', () => {
    expect(getActiveTodos([active, done])).toEqual([active])
    expect(getCompletedTodos([active, done])).toEqual([done])
  })

  it('komponerar med getRootTodos', () => {
    const todosById = makeTodosById(active, done)

    expect(getActiveTodos(getRootTodos(todosById, HOME)).map((t) => t.id)).toEqual(['active'])
  })
})

describe('getTodoProgress', () => {
  it('räknar direkta barn, inte hela subträdet', () => {
    const todosById = makeTodosById(
      makeTodo({ id: 'stada' }),
      makeTodo({ id: 'koket', parentId: 'stada', completedAt: '2026-01-02T00:00:00.000Z' }),
      makeTodo({ id: 'badrum', parentId: 'stada' }),
      // Barnbarn ska inte räknas in i Städas progress.
      makeTodo({ id: 'ugn', parentId: 'koket' }),
      makeTodo({ id: 'disk', parentId: 'koket', completedAt: '2026-01-02T00:00:00.000Z' })
    )

    expect(getTodoProgress(todosById, 'stada')).toEqual({ total: 2, completed: 1 })
  })

  it('ger 0/0 för en todo utan barn', () => {
    const todosById = makeTodosById(makeTodo({ id: 'ensam' }))

    expect(getTodoProgress(todosById, 'ensam')).toEqual({ total: 0, completed: 0 })
  })
})
