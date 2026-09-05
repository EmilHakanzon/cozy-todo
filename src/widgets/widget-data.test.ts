'use no memo'

import { describe, expect, it } from 'vitest'

import type { Todo, TodoById } from '@/features/todos/types'
import type { TodoList } from '@/features/lists/types'
import type { Tag } from '@/features/tags/types'

import { filterTodosForWidget } from './widget-data'

function makeTodo(overrides: Partial<Todo> & Pick<Todo, 'id'>): Todo {
  return {
    listId: 'list-1',
    parentId: null,
    title: overrides.id,
    notes: '',
    dueAt: null,
    completedAt: null,
    recurrence: null,
    tagIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    position: 0,
    ...overrides,
  }
}

function makeTodosById(...todos: Todo[]): TodoById {
  return Object.fromEntries(todos.map((todo) => [todo.id, todo]))
}

function makeList(overrides: Partial<TodoList> & Pick<TodoList, 'id'>): TodoList {
  return {
    name: overrides.id,
    color: 'sage',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeTag(overrides: Partial<Tag> & Pick<Tag, 'id'>): Tag {
  return {
    name: overrides.id,
    color: 'red',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const today = new Date().toISOString().split('T')[0]

describe('filterTodosForWidget', () => {
  it('returns only today\'s root todos, sorted active-first then by position', () => {
    const listsById = { 'list-1': makeList({ id: 'list-1' }) }
    const tagsById: Record<string, Tag> = {}
    const todosById = makeTodosById(
      makeTodo({ id: 'active-2', dueAt: `${today}T18:00:00.000Z`, position: 1 }),
      makeTodo({ id: 'active-1', dueAt: `${today}T09:00:00.000Z`, position: 0 }),
      makeTodo({
        id: 'done-1',
        dueAt: `${today}T08:00:00.000Z`,
        completedAt: `${today}T08:30:00.000Z`,
        position: 0,
      }),
      makeTodo({
        id: 'done-2',
        dueAt: `${today}T07:00:00.000Z`,
        completedAt: `${today}T07:30:00.000Z`,
        position: 1,
      }),
    )

    const result = filterTodosForWidget(todosById, listsById, tagsById)

    expect(result.todos.map((t) => t.id)).toEqual(['active-1', 'active-2', 'done-1', 'done-2'])
    expect(result.totalCount).toBe(4)
  })

  it('excludes child todos and non-today todos', () => {
    const listsById = { 'list-1': makeList({ id: 'list-1' }) }
    const tagsById: Record<string, Tag> = {}
    const todosById = makeTodosById(
      makeTodo({ id: 'today-root', dueAt: `${today}T09:00:00.000Z` }),
      makeTodo({ id: 'today-child', parentId: 'today-root', dueAt: `${today}T09:00:00.000Z` }),
      makeTodo({ id: 'future', dueAt: '2099-12-31T00:00:00.000Z' }),
      makeTodo({ id: 'no-date', dueAt: null }),
    )

    const result = filterTodosForWidget(todosById, listsById, tagsById)

    expect(result.todos.map((t) => t.id)).toEqual(['today-root'])
    expect(result.totalCount).toBe(1)
  })

  it('resolves first tag color from tagIds', () => {
    const listsById = { 'list-1': makeList({ id: 'list-1' }) }
    const tagsById = {
      'tag-1': makeTag({ id: 'tag-1', color: 'blue' }),
      'tag-2': makeTag({ id: 'tag-2', color: 'green' }),
    }
    const todosById = makeTodosById(
      makeTodo({ id: 'tagged', dueAt: `${today}T09:00:00.000Z`, tagIds: ['tag-1', 'tag-2'] }),
    )

    const result = filterTodosForWidget(todosById, listsById, tagsById)

    expect(result.todos[0].tagColor).toBe('blue')
  })

  it('returns empty when no todos for today', () => {
    const listsById = { 'list-1': makeList({ id: 'list-1' }) }
    const tagsById: Record<string, Tag> = {}
    const todosById = makeTodosById(
      makeTodo({ id: 'future', dueAt: '2099-12-31T00:00:00.000Z' }),
      makeTodo({ id: 'no-date', dueAt: null }),
    )

    const result = filterTodosForWidget(todosById, listsById, tagsById)

    expect(result.todos).toEqual([])
    expect(result.totalCount).toBe(0)
  })

  it('handles missing list/tag gracefully (defaults: listColor=sage, tagColor=null)', () => {
    const listsById: Record<string, TodoList> = {}
    const tagsById: Record<string, Tag> = {}
    const todosById = makeTodosById(
      makeTodo({
        id: 'orphan',
        listId: 'missing-list',
        dueAt: `${today}T09:00:00.000Z`,
        tagIds: ['missing-tag'],
      }),
    )

    const result = filterTodosForWidget(todosById, listsById, tagsById)

    expect(result.todos[0].listColor).toBe('sage')
    expect(result.todos[0].tagColor).toBeNull()
  })
})
