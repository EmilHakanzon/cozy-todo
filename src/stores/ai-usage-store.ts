import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type UsageEntry = {
  timestamp: string
  promptTokens: number
  completionTokens: number
  model: string
}

type AiUsageState = {
  entries: UsageEntry[]
  // Local kill switch for Smart Add, toggled from the hidden section of the AI
  // Usage screen. Per-device only -- it stops this install from spending
  // tokens, it cannot reach anyone else's phone.
  aiEnabled: boolean
  hasHydrated: boolean

  logUsage: (entry: Omit<UsageEntry, 'timestamp'>) => void
  setAiEnabled: (value: boolean) => void
  clearUsage: () => void
}

const GPT4O_MINI_INPUT_PER_TOKEN = 0.15 / 1_000_000
const GPT4O_MINI_OUTPUT_PER_TOKEN = 0.60 / 1_000_000

export function estimateCost(entry: Pick<UsageEntry, 'promptTokens' | 'completionTokens'>): number {
  return (
    entry.promptTokens * GPT4O_MINI_INPUT_PER_TOKEN +
    entry.completionTokens * GPT4O_MINI_OUTPUT_PER_TOKEN
  )
}

// Only an explicit stored `false` disables Smart Add. A missing, corrupt or
// non-boolean value falls back to enabled, so a bad persisted record can never
// leave the feature dead with no visible cause and no way to diagnose it.
export function normalizeAiEnabled(value: unknown): boolean {
  return value !== false
}

export function aggregateUsage(entries: UsageEntry[]) {
  let promptTokens = 0
  let completionTokens = 0
  let cost = 0

  for (const e of entries) {
    promptTokens += e.promptTokens
    completionTokens += e.completionTokens
    cost += estimateCost(e)
  }

  return { requests: entries.length, promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, cost }
}

export function filterByRange(entries: UsageEntry[], range: 'day' | 'week' | 'month'): UsageEntry[] {
  const now = new Date()
  let cutoff: Date

  if (range === 'day') {
    cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (range === 'week') {
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
  } else {
    cutoff = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const cutoffStr = cutoff.toISOString()
  return entries.filter((e) => e.timestamp >= cutoffStr)
}

export const useAiUsageStore = create<AiUsageState>()(
  persist(
    (set) => ({
      entries: [],
      aiEnabled: true,
      hasHydrated: false,

      logUsage: (entry) =>
        set((state) => ({
          entries: [...state.entries, { ...entry, timestamp: new Date().toISOString() }],
        })),

      setAiEnabled: (value) => set({ aiEnabled: value }),

      // Deliberately leaves aiEnabled alone: wiping the numbers is a display
      // concern, and silently re-enabling spending would be a nasty surprise.
      clearUsage: () => set({ entries: [] }),
    }),
    {
      name: 'ai-usage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries, aiEnabled: state.aiEnabled }),
      merge: (persisted, current) => {
        const incoming = (persisted ?? {}) as Partial<AiUsageState>
        const entries = Array.isArray(incoming.entries) ? incoming.entries : []
        return { ...current, entries, aiEnabled: normalizeAiEnabled(incoming.aiEnabled) }
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.error('Failed to rehydrate AI usage', error)
        useAiUsageStore.setState({ hasHydrated: true })
      },
    },
  ),
)
