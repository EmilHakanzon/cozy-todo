import type { TagColor } from '@/features/tags/types'

type TagPalette = { background: string; text: string }

const lightTagColors: Record<TagColor, TagPalette> = {
  red: { background: '#f5dbd8', text: '#9b3228' },
  orange: { background: '#f5e3d0', text: '#9b5a1e' },
  yellow: { background: '#f5eec8', text: '#8a7a1a' },
  green: { background: '#d8edda', text: '#2d6e35' },
  blue: { background: '#d4e4f5', text: '#2b5a8a' },
  purple: { background: '#e4d8f0', text: '#5b3a8a' },
  pink: { background: '#f5d8e8', text: '#8a2b5a' },
  gray: { background: '#e5e5e0', text: '#5a5a55' },
}

const darkTagColors: Record<TagColor, TagPalette> = {
  red: { background: '#3d2220', text: '#e89088' },
  orange: { background: '#3d2e1a', text: '#e8a870' },
  yellow: { background: '#3a351a', text: '#d8c860' },
  green: { background: '#1e3320', text: '#80c888' },
  blue: { background: '#1a2a3d', text: '#70a8d8' },
  purple: { background: '#2a1e3d', text: '#a880d0' },
  pink: { background: '#3d1a2e', text: '#d880a8' },
  gray: { background: '#2a2a28', text: '#a0a098' },
}

export function tagColorsFor(mode: 'light' | 'dark'): Record<TagColor, TagPalette> {
  return mode === 'dark' ? darkTagColors : lightTagColors
}
