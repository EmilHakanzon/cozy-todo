import { beforeEach, describe, expect, it } from 'vitest'

import { normalizeAiEnabled, useAiUsageStore } from './ai-usage-store'

const store = () => useAiUsageStore.getState()

beforeEach(() => {
  useAiUsageStore.setState({ entries: [], aiEnabled: true })
})

describe('normalizeAiEnabled', () => {
  it('disables only on an explicit false', () => {
    expect(normalizeAiEnabled(false)).toBe(false)
  })

  it('stays enabled for a value that was never written', () => {
    // The shape of every install that predates the kill switch.
    expect(normalizeAiEnabled(undefined)).toBe(true)
  })

  it('stays enabled for a corrupt value rather than trapping the user', () => {
    for (const corrupt of [null, 'false', 0, {}]) {
      expect(normalizeAiEnabled(corrupt)).toBe(true)
    }
  })
})

describe('setAiEnabled', () => {
  it('toggles both ways', () => {
    store().setAiEnabled(false)
    expect(store().aiEnabled).toBe(false)

    store().setAiEnabled(true)
    expect(store().aiEnabled).toBe(true)
  })
})

describe('clearUsage', () => {
  it('wipes the numbers without re-enabling spending', () => {
    store().logUsage({ promptTokens: 10, completionTokens: 5, model: 'gpt-4o-mini' })
    store().setAiEnabled(false)

    store().clearUsage()

    expect(store().entries).toEqual([])
    expect(store().aiEnabled).toBe(false)
  })
})
