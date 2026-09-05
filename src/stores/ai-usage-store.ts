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
  hasHydrated: boolean

  logUsage: (entry: Omit<UsageEntry, 'timestamp'>) => void
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
      hasHydrated: false,

      logUsage: (entry) =>
        set((state) => ({
          entries: [...state.entries, { ...entry, timestamp: new Date().toISOString() }],
        })),

      clearUsage: () => set({ entries: [] }),
    }),
    {
      name: 'ai-usage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries }),
      merge: (persisted, current) => {
        const incoming = (persisted ?? {}) as Partial<AiUsageState>
        const entries = Array.isArray(incoming.entries) ? incoming.entries : []
        return { ...current, entries }
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.error('Failed to rehydrate AI usage', error)
        useAiUsageStore.setState({ hasHydrated: true })
      },
    },
  ),
)
