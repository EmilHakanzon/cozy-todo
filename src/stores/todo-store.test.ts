import { beforeEach, describe, expect, it } from 'vitest'

import { getChildren, getDescendantIds } from '@/features/todos/todo-tree'
import { useTodoStore } from './todo-store'

const HOME = 'list-home'
const PERSONAL = 'list-personal'

// Plocka ut store-actions utan React — zustand-storen är bara ett vanligt objekt.
const store = () => useTodoStore.getState()
const todo = (id: string) => useTodoStore.getState().todosById[id]

beforeEach(() => {
  useTodoStore.setState({ todosById: {} })
})

describe('moveTodo', () => {
  it('root -> child: flyttar Badrum under Städa', () => {
    const stada = store().createTodo({ listId: HOME, title: 'Städa' })
    const badrum = store().createTodo({ listId: HOME, title: 'Badrum' })

    expect(todo(badrum).parentId).toBeNull()

    store().moveTodo(badrum, stada)

    expect(todo(badrum).parentId).toBe(stada)
    expect(todo(badrum).listId).toBe(HOME)
    expect(getChildren(store().todosById, stada).map((t) => t.id)).toEqual([badrum])
    // Första barnet under en tom förälder ska hamna på position 0.
    expect(todo(badrum).position).toBe(0)
  })

  it('child -> root: flyttar Badrum tillbaka till root', () => {
    const stada = store().createTodo({ listId: HOME, title: 'Städa' })
    const badrum = store().createTodo({ listId: HOME, parentId: stada, title: 'Badrum' })

    store().moveTodo(badrum, null)

    expect(todo(badrum).parentId).toBeNull()
    expect(todo(badrum).listId).toBe(HOME)
    expect(getChildren(store().todosById, stada)).toEqual([])
    // Städa ligger på position 0 i root, så Badrum ska hamna efter.
    expect(todo(badrum).position).toBe(todo(stada).position + 1)
  })

  it('cross-list: hela subträdet följer med till Personal', () => {
    const stada = store().createTodo({ listId: HOME, title: 'Städa' })
    const koket = store().createTodo({ listId: HOME, parentId: stada, title: 'Köket' })
    const diskbank = store().createTodo({ listId: HOME, parentId: koket, title: 'Diskbänk' })
    const personalRoot = store().createTodo({ listId: PERSONAL, title: 'Personal-rot' })

    store().moveTodo(stada, personalRoot)

    // Både noden och ALLA ättlingar ska byta listId — inte bara första nivån.
    expect(todo(stada).listId).toBe(PERSONAL)
    expect(todo(koket).listId).toBe(PERSONAL)
    expect(todo(diskbank).listId).toBe(PERSONAL)

    // Strukturen ska vara orörd efter flytten.
    expect(todo(stada).parentId).toBe(personalRoot)
    expect(todo(koket).parentId).toBe(stada)
    expect(todo(diskbank).parentId).toBe(koket)
    expect(getDescendantIds(store().todosById, stada)).toEqual([koket, diskbank])
  })

  it('cross-list till root behåller nodens egen lista', () => {
    const stada = store().createTodo({ listId: HOME, title: 'Städa' })
    const koket = store().createTodo({ listId: HOME, parentId: stada, title: 'Köket' })

    store().moveTodo(koket, null)

    expect(todo(koket).parentId).toBeNull()
    expect(todo(koket).listId).toBe(HOME)
  })

  it('kastar när en todo görs till sin egen förälder', () => {
    const a = store().createTodo({ listId: HOME, title: 'A' })

    expect(() => store().moveTodo(a, a)).toThrow(/own parent/i)
  })

  it('kastar när en förälder flyttas in i sitt eget barn', () => {
    const parent = store().createTodo({ listId: HOME, title: 'Parent' })
    const child = store().createTodo({ listId: HOME, parentId: parent, title: 'Child' })

    expect(() => store().moveTodo(parent, child)).toThrow(/descendant/i)
  })

  it('kastar även på djupare cykel (barnbarn)', () => {
    const parent = store().createTodo({ listId: HOME, title: 'Parent' })
    const child = store().createTodo({ listId: HOME, parentId: parent, title: 'Child' })
    const grandchild = store().createTodo({ listId: HOME, parentId: child, title: 'Grandchild' })

    expect(() => store().moveTodo(parent, grandchild)).toThrow(/descendant/i)
  })

  it('kastar på okänd todo och okänd målförälder', () => {
    const a = store().createTodo({ listId: HOME, title: 'A' })

    expect(() => store().moveTodo('finns-inte', null)).toThrow(/does not exist/i)
    expect(() => store().moveTodo(a, 'finns-inte')).toThrow(/Target parent does not exist/i)
  })

  it('lämnar state orört när flytten kastar', () => {
    const parent = store().createTodo({ listId: HOME, title: 'Parent' })
    const child = store().createTodo({ listId: HOME, parentId: parent, title: 'Child' })
    const before = store().todosById

    expect(() => store().moveTodo(parent, child)).toThrow()

    // Ingen partiell mutation: samma referens = set() kördes aldrig.
    expect(store().todosById).toBe(before)
  })

  it('lägger flyttad nod sist bland sina nya syskon', () => {
    const stada = store().createTodo({ listId: HOME, title: 'Städa' })
    store().createTodo({ listId: HOME, parentId: stada, title: 'Köket' })
    const badrum = store().createTodo({ listId: HOME, title: 'Badrum' })

    store().moveTodo(badrum, stada)

    expect(getChildren(store().todosById, stada).map((t) => t.title)).toEqual(['Köket', 'Badrum'])
  })
})

describe('createTodo', () => {
  it('vägrar tomma titlar', () => {
    expect(() => store().createTodo({ listId: HOME, title: '   ' })).toThrow(/empty/i)
  })

  it('vägrar förälder i annan lista', () => {
    const stada = store().createTodo({ listId: HOME, title: 'Städa' })

    expect(() =>
      store().createTodo({ listId: PERSONAL, parentId: stada, title: 'Köket' })
    ).toThrow(/same list/i)
  })
})

describe('deleteTodo', () => {
  it('tar bort hela subträdet men rör inte syskon', () => {
    const stada = store().createTodo({ listId: HOME, title: 'Städa' })
    const koket = store().createTodo({ listId: HOME, parentId: stada, title: 'Köket' })
    const diskbank = store().createTodo({ listId: HOME, parentId: koket, title: 'Diskbänk' })
    const annat = store().createTodo({ listId: HOME, title: 'Annat' })

    store().deleteTodo(stada)

    expect(Object.keys(store().todosById)).toEqual([annat])
    expect(todo(koket)).toBeUndefined()
    expect(todo(diskbank)).toBeUndefined()
  })
})

describe('toggleTodo', () => {
  it('togglar fram och tillbaka', () => {
    const a = store().createTodo({ listId: HOME, title: 'A' })

    store().toggleTodo(a)
    expect(todo(a).completedAt).not.toBeNull()

    store().toggleTodo(a)
    expect(todo(a).completedAt).toBeNull()
  })
})

describe('createTodo tagIds', () => {
  it('stores the given tag ids', () => {
    const id = store().createTodo({
      listId: HOME,
      title: 'Handla',
      tagIds: ['tag-a', 'tag-b'],
    })

    expect(todo(id).tagIds).toEqual(['tag-a', 'tag-b'])
  })

  it('defaults to an empty array when omitted', () => {
    const id = store().createTodo({ listId: HOME, title: 'Utan taggar' })

    expect(todo(id).tagIds).toEqual([])
  })
})
