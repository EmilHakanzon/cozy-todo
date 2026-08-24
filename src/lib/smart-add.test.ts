import { afterEach, describe, expect, it, vi } from 'vitest'

// Hoisted above the import: the module reads the key once at load time.
vi.hoisted(() => {
  process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key'
})

import { formatGeminiError, normalizeParsedTodos, smartAddChat } from './smart-add'

const quotaBody = JSON.stringify({
  error: {
    code: 429,
    message: 'You exceeded your current quota, please check your plan.',
    status: 'RESOURCE_EXHAUSTED',
  },
})

describe('formatGeminiError', () => {
  it('maps 429 to a daily-limit sentence instead of the raw body', () => {
    expect(formatGeminiError(429, quotaBody)).toBe(
      'Smart Add has reached its daily limit. It resets tomorrow.',
    )
  })

  it('maps 400 to an invalid-key sentence', () => {
    expect(formatGeminiError(400, '{"error":{"message":"API key not valid"}}')).toBe(
      'The Smart Add API key looks invalid. Check your configuration.',
    )
  })

  it('maps 403 to an invalid-key sentence', () => {
    expect(formatGeminiError(403, '{"error":{"message":"Forbidden"}}')).toBe(
      'The Smart Add API key looks invalid. Check your configuration.',
    )
  })

  it('uses the API message for other statuses', () => {
    expect(
      formatGeminiError(404, '{"error":{"message":"Model not found"}}'),
    ).toBe('Model not found')
  })

  it('falls back to a generic sentence when the body is not JSON', () => {
    expect(formatGeminiError(500, '<html>Gateway error</html>')).toBe(
      'Smart Add is unavailable right now.',
    )
  })

  it('falls back to a generic sentence when JSON has no error message', () => {
    expect(formatGeminiError(500, '{"ok":false}')).toBe(
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

function candidateText(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('smartAddChat', () => {
  it('reports a friendly error when a 200 carries no candidates', async () => {
    // A safety block or recitation stop: status 200, empty candidates. The
    // `?? ''` fallback used to send an empty string straight into JSON.parse.
    mockOkResponse({ candidates: [] })

    await expect(smartAddChat([], 'plan my day')).rejects.toThrow(UNREADABLE)
  })

  it('reports the same error when the JSON is truncated mid-object', async () => {
    mockOkResponse(candidateText('{"message":"On it","todos":[{"title":"bu'))

    await expect(smartAddChat([], 'plan my day')).rejects.toThrow(UNREADABLE)
  })

  it('never surfaces a raw SyntaxError to the caller', async () => {
    mockOkResponse(candidateText('not json at all'))

    const error = await smartAddChat([], 'plan my day').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(SyntaxError)
    expect((error as Error).message).toBe(UNREADABLE)
  })

  it('still parses a well-formed response', async () => {
    mockOkResponse(
      candidateText('{"message":"Here you go","todos":[{"title":"buy milk"}]}'),
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

  it('returns an empty array for a non-array input', () => {
    expect(normalizeParsedTodos(undefined)).toEqual([])
  })
})
