import { afterEach, describe, expect, it, vi } from 'vitest'

// Hoisted above the import: the module reads the key once at load time.
vi.hoisted(() => {
  process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'test-key'
})

import { formatOpenAIError, normalizeParsedTodos, smartAddChat } from './smart-add'

const quotaBody = JSON.stringify({
  error: {
    message: 'You exceeded your current quota, please check your plan.',
    type: 'insufficient_quota',
  },
})

describe('formatOpenAIError', () => {
  it('maps 429 to a rate-limit sentence instead of the raw body', () => {
    expect(formatOpenAIError(429, quotaBody)).toBe(
      'Smart Add has reached its rate limit. Try again in a moment.',
    )
  })

  it('maps 401 to an invalid-key sentence', () => {
    expect(formatOpenAIError(401, '{"error":{"message":"Incorrect API key provided"}}')).toBe(
      'The Smart Add API key looks invalid. Check your configuration.',
    )
  })

  it('uses the API message for other statuses', () => {
    expect(
      formatOpenAIError(404, '{"error":{"message":"Model not found"}}'),
    ).toBe('Model not found')
  })

  it('falls back to a generic sentence when the body is not JSON', () => {
    expect(formatOpenAIError(500, '<html>Gateway error</html>')).toBe(
      'Smart Add is unavailable right now.',
    )
  })

  it('falls back to a generic sentence when JSON has no error message', () => {
    expect(formatOpenAIError(500, '{"ok":false}')).toBe(
      'Smart Add is unavailable right now.',
    )
  })
})

const UNREADABLE = 'Smart Add returned an unreadable response. Try again.'

function mockOkResponse(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body }),
  )
}

function chatCompletion(text: string) {
  return { choices: [{ message: { content: text } }] }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('smartAddChat', () => {
  it('reports a friendly error when a 200 carries no choices', async () => {
    mockOkResponse({ choices: [] })

    await expect(smartAddChat([], 'plan my day')).rejects.toThrow(UNREADABLE)
  })

  it('reports the same error when the JSON is truncated mid-object', async () => {
    mockOkResponse(chatCompletion('{"message":"On it","todos":[{"title":"bu'))

    await expect(smartAddChat([], 'plan my day')).rejects.toThrow(UNREADABLE)
  })

  it('never surfaces a raw SyntaxError to the caller', async () => {
    mockOkResponse(chatCompletion('not json at all'))

    const error = await smartAddChat([], 'plan my day').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(SyntaxError)
    expect((error as Error).message).toBe(UNREADABLE)
  })

  it('still parses a well-formed response', async () => {
    mockOkResponse(
      chatCompletion('{"message":"Here you go","todos":[{"title":"buy milk"}]}'),
    )

    const result = await smartAddChat([], 'plan my day')

    expect(result.message).toBe('Here you go')
    expect(result.todos).toHaveLength(1)
  })
})

describe('normalizeParsedTodos', () => {
  it('keeps well-formed tags', () => {
    const todos = normalizeParsedTodos([
      { title: 'a', dueAt: null, notes: '', subtasks: [], tags: ['work'] },
    ])
    expect(todos[0].tags).toEqual(['work'])
  })

  it('defaults a missing tags field to an empty array', () => {
    const todos = normalizeParsedTodos([{ title: 'a' }])
    expect(todos[0].tags).toEqual([])
    expect(todos[0].subtasks).toEqual([])
    expect(todos[0].notes).toBe('')
    expect(todos[0].dueAt).toBeNull()
  })

  it('discards a tags field that is not an array of strings', () => {
    const todos = normalizeParsedTodos([{ title: 'a', tags: 'work' }])
    expect(todos[0].tags).toEqual([])
  })

  it('drops non-string entries inside tags', () => {
    const todos = normalizeParsedTodos([{ title: 'a', tags: ['work', 7, null] }])
    expect(todos[0].tags).toEqual(['work'])
  })

  it('discards entries with no usable title', () => {
    expect(normalizeParsedTodos([{ notes: 'orphan' }, { title: 'ok' }])).toHaveLength(1)
  })

  it('discards entries whose title is only whitespace', () => {
    expect(normalizeParsedTodos([{ title: '   ' }, { title: 'ok' }])).toHaveLength(1)
  })

  it('survives null and undefined entries in the array', () => {
    const todos = normalizeParsedTodos([null, undefined, { title: 'ok' }])

    expect(todos).toHaveLength(1)
    expect(todos[0].title).toBe('ok')
  })

  it('returns an empty array for a non-array input', () => {
    expect(normalizeParsedTodos(undefined)).toEqual([])
  })
})
