import { afterEach, describe, expect, it, vi } from 'vitest'

import { toDateString } from '@/lib/date-utils'

import {
  getActiveTodos,
  getBacklogTodos,
  getDailyPlanCounts,
  getOverdueTodos,
  getActiveCountForList,
  getAllRootTodos,
  getCompletedTodos,
  getRootTodos,
  getTodayTodos,
  getTodoProgress,
  getTodosForList,
  getTodosInDateRange,
  groupTodosByDate,
  getTodosForDate,
  getUpcomingTodos,
  searchTodos,
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
    recurrence: null,
    tagIds: [],
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

describe('getAllRootTodos', () => {
  it('returns only root todos across all lists, sorted by position', () => {
    const todosById = makeTodosById(
      makeTodo({ id: 'a', position: 1 }),
      makeTodo({ id: 'b', position: 0 }),
      makeTodo({ id: 'c', parentId: 'a', position: 0 }),
      makeTodo({ id: 'd', listId: PERSONAL, position: 0 }),
    )
    const result = getAllRootTodos(todosById)
    expect(result.map((t) => t.id)).toEqual(['b', 'd', 'a'])
  })
})

describe('getTodayTodos', () => {
  it('returns todos due today', () => {
    const today = toDateString(new Date())
    const todos = [
      makeTodo({ id: 'a', dueAt: `${today}T18:00:00.000Z` }),
      makeTodo({ id: 'b', dueAt: '2099-12-31T00:00:00.000Z' }),
      makeTodo({ id: 'c', dueAt: null }),
    ]
    const result = getTodayTodos(todos)
    expect(result.map((t) => t.id)).toEqual(['a'])
  })
})

describe('getUpcomingTodos', () => {
  it('returns todos due after today', () => {
    const today = toDateString(new Date())
    const todos = [
      makeTodo({ id: 'a', dueAt: `${today}T18:00:00.000Z` }),
      makeTodo({ id: 'b', dueAt: '2099-12-31T00:00:00.000Z' }),
      makeTodo({ id: 'c', dueAt: null }),
    ]
    const result = getUpcomingTodos(todos)
    expect(result.map((t) => t.id)).toEqual(['b'])
  })
})

afterEach(() => {
  vi.useRealTimers()
})

/**
 * 00:30 lokal tid: i varje zon öster om UTC pekar UTC-dygnet fortfarande på
 * gårdagen. Selektorerna måste följa användarens kalender, inte UTC:s.
 */
function freezeAtLocalMidnightish() {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 8, 4, 0, 30, 0))
}

describe('getOverdueTodos', () => {
  it('mäter försening mot lokal dag, inte UTC-dag', () => {
    freezeAtLocalMidnightish()
    const igar = toDateString(new Date(2026, 8, 3))
    const todosById = makeTodosById(
      makeTodo({ id: 'forsenad', dueAt: `${igar}T09:00:00.000Z` }),
    )

    expect(getOverdueTodos(todosById).map((t) => t.id)).toEqual(['forsenad'])
  })

  it('utesluter klara, odaterade och barn-todos', () => {
    freezeAtLocalMidnightish()
    const igar = toDateString(new Date(2026, 8, 3))
    const todosById = makeTodosById(
      makeTodo({ id: 'forsenad', dueAt: `${igar}T09:00:00.000Z` }),
      makeTodo({ id: 'klar', dueAt: `${igar}T09:00:00.000Z`, completedAt: '2026-09-03T10:00:00.000Z' }),
      makeTodo({ id: 'odaterad', dueAt: null }),
      makeTodo({ id: 'barn', parentId: 'forsenad', dueAt: `${igar}T09:00:00.000Z` }),
    )

    expect(getOverdueTodos(todosById).map((t) => t.id)).toEqual(['forsenad'])
  })
})

describe('getTodayTodos', () => {
  it('hittar dagens todo även när UTC redan bytt dygn', () => {
    freezeAtLocalMidnightish()
    const idag = toDateString(new Date(2026, 8, 4))
    const todos = [makeTodo({ id: 'idag', dueAt: `${idag}T09:00:00.000Z` })]

    expect(getTodayTodos(todos).map((t) => t.id)).toEqual(['idag'])
  })
})

describe('getBacklogTodos', () => {
  it('tar bara aktiva root-todos utan datum', () => {
    const todosById = makeTodosById(
      makeTodo({ id: 'utan-datum', position: 1 }),
      makeTodo({ id: 'daterad', dueAt: '2026-09-04T09:00:00.000Z' }),
      makeTodo({ id: 'klar', completedAt: '2026-09-01T00:00:00.000Z' }),
      makeTodo({ id: 'barn', parentId: 'utan-datum' }),
    )

    expect(getBacklogTodos(todosById).map((t) => t.id)).toEqual(['utan-datum'])
  })
})

describe('getDailyPlanCounts', () => {
  it('räknar dagens aktiva och de försenade var för sig', () => {
    freezeAtLocalMidnightish()
    const idag = toDateString(new Date(2026, 8, 4))
    const igar = toDateString(new Date(2026, 8, 3))
    const todosById = makeTodosById(
      makeTodo({ id: 'idag-1', dueAt: `${idag}T09:00:00.000Z` }),
      makeTodo({ id: 'idag-2', dueAt: `${idag}T18:00:00.000Z` }),
      makeTodo({ id: 'idag-klar', dueAt: `${idag}T08:00:00.000Z`, completedAt: `${idag}T08:30:00.000Z` }),
      makeTodo({ id: 'forsenad', dueAt: `${igar}T09:00:00.000Z` }),
      makeTodo({ id: 'odaterad', dueAt: null }),
    )

    expect(getDailyPlanCounts(todosById)).toEqual({ todayCount: 2, overdueCount: 1 })
  })
})

describe('getActiveCountForList', () => {
  it('counts only active root todos in a list', () => {
    const todosById = makeTodosById(
      makeTodo({ id: 'a', listId: HOME }),
      makeTodo({ id: 'b', listId: HOME, completedAt: '2026-01-01T00:00:00.000Z' }),
      makeTodo({ id: 'c', listId: HOME, parentId: 'a' }),
      makeTodo({ id: 'd', listId: PERSONAL }),
    )
    expect(getActiveCountForList(todosById, HOME)).toBe(1)
  })
})

describe('getTodosInDateRange', () => {
  it('returns root todos with dueAt in range', () => {
    const todosById = makeTodosById(
      makeTodo({ id: 'a', dueAt: '2026-08-17T09:00:00.000Z', position: 0 }),
      makeTodo({ id: 'b', dueAt: '2026-08-19T10:00:00.000Z', position: 1 }),
      makeTodo({ id: 'c', dueAt: '2026-08-25T10:00:00.000Z', position: 2 }),
      makeTodo({ id: 'd', dueAt: null, position: 3 }),
      makeTodo({ id: 'e', dueAt: '2026-08-18T08:00:00.000Z', parentId: 'a', position: 0 }),
    )
    const result = getTodosInDateRange(todosById, '2026-08-17', '2026-08-23')
    expect(result.map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('groupTodosByDate', () => {
  it('groups todos by date string', () => {
    const todos = [
      makeTodo({ id: 'a', dueAt: '2026-08-17T09:00:00.000Z' }),
      makeTodo({ id: 'b', dueAt: '2026-08-17T14:00:00.000Z' }),
      makeTodo({ id: 'c', dueAt: '2026-08-18T10:00:00.000Z' }),
    ]
    const groups = groupTodosByDate(todos)
    expect(groups.get('2026-08-17')?.map((t) => t.id)).toEqual(['a', 'b'])
    expect(groups.get('2026-08-18')?.map((t) => t.id)).toEqual(['c'])
  })

  it('skips todos without dueAt', () => {
    const todos = [
      makeTodo({ id: 'a', dueAt: null }),
      makeTodo({ id: 'b', dueAt: '2026-08-17T09:00:00.000Z' }),
    ]
    const groups = groupTodosByDate(todos)
    expect(groups.size).toBe(1)
  })
})

describe('getTodosForDate', () => {
  it('returns root todos for a specific date', () => {
    const todosById = makeTodosById(
      makeTodo({ id: 'a', dueAt: '2026-08-17T09:00:00.000Z', position: 0 }),
      makeTodo({ id: 'b', dueAt: '2026-08-18T10:00:00.000Z', position: 1 }),
      makeTodo({ id: 'c', dueAt: '2026-08-17T14:00:00.000Z', parentId: 'a', position: 0 }),
    )
    const result = getTodosForDate(todosById, '2026-08-17')
    expect(result.map((t) => t.id)).toEqual(['a'])
  })
})

describe('searchTodos', () => {
  const searchData = makeTodosById(
    makeTodo({ id: 'todo-1', title: 'Buy groceries', notes: 'milk, eggs, bread' }),
    makeTodo({ id: 'todo-2', title: 'Clean kitchen', notes: '' }),
    makeTodo({ id: 'todo-3', title: 'Write report', notes: 'quarterly review for grocery division', listId: PERSONAL }),
  )

  it('matches title case-insensitively', () => {
    const results = searchTodos(searchData, 'groceries')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('todo-1')
  })

  it('matches notes content', () => {
    const results = searchTodos(searchData, 'quarterly')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('todo-3')
  })

  it('returns empty for no match', () => {
    expect(searchTodos(searchData, 'zzzzz')).toHaveLength(0)
  })

  it('returns empty for blank query', () => {
    expect(searchTodos(searchData, '')).toHaveLength(0)
    expect(searchTodos(searchData, '  ')).toHaveLength(0)
  })

  it('matches partial words', () => {
    const results = searchTodos(searchData, 'clean')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('todo-2')
  })
})
