import { describe, expect, it } from 'vitest'

import { formatGeminiError } from './smart-add'

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
