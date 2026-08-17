import { lightColors, darkColors } from './colors'
import { buildAccentColors } from './list-color'
import { radius } from './radius'
import { spacing } from './spacing'

import type { TodoListColor } from '@/features/lists/types'

export type ResolvedTheme = 'light' | 'dark'

export function buildTheme(resolvedTheme: ResolvedTheme, accentColor: TodoListColor) {
  const baseColors = resolvedTheme === 'dark' ? darkColors : lightColors
  const accentPair = buildAccentColors(accentColor, resolvedTheme)

  return {
    color: {
      ...baseColors,
      accent: accentPair.accent,
      accentSoft: accentPair.accentSoft,
    },
    spacing,
    radius,
  } as const
}

export const lightTheme = buildTheme('light', 'sage')
export const darkTheme = buildTheme('dark', 'sage')
