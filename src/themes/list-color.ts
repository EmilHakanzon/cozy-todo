import type { TodoListColor } from '../features/lists/types'
import type { ResolvedTheme } from './theme'

type ListColorPalette = {
  background: string
  accent: string
}

export const lightListColors: Record<TodoListColor, ListColorPalette> = {
  sage: {
    background: '#DDE6DC',
    accent: '#526B57',
  },

  terracotta: {
    background: '#F0DDD4',
    accent: '#A85F49',
  },

  ochre: {
    background: '#EFE2BF',
    accent: '#967326',
  },

  dustyBlue: {
    background: '#DDE5EA',
    accent: '#577486',
  },

  lavender: {
    background: '#E7E1EC',
    accent: '#74647F',
  },

  taupe: {
    background: '#E5DED6',
    accent: '#766A5D',
  },
}

// Dark mode vänder rollerna: background blir en dämpad, mörk ton som lever nära
// surface (#21231f), accent blir den ljusa tonen så den syns mot mörk bakgrund.
export const darkListColors: Record<TodoListColor, ListColorPalette> = {
  sage: {
    background: '#2C3A2F',
    accent: '#9FBBA3',
  },

  terracotta: {
    background: '#3D2C25',
    accent: '#D79E88',
  },

  ochre: {
    background: '#3A3222',
    accent: '#CDB176',
  },

  dustyBlue: {
    background: '#263239',
    accent: '#9BB6C6',
  },

  lavender: {
    background: '#322C39',
    accent: '#B6A8C4',
  },

  taupe: {
    background: '#332E28',
    accent: '#C2B4A4',
  },
}

export function listColorsFor(resolvedTheme: ResolvedTheme): Record<TodoListColor, ListColorPalette> {
  return resolvedTheme === 'dark' ? darkListColors : lightListColors
}

export function buildAccentColors(color: TodoListColor, mode: 'light' | 'dark') {
  const palette = mode === 'dark' ? darkListColors : lightListColors
  return {
    accent: palette[color].accent,
    accentSoft: palette[color].background,
  }
}
