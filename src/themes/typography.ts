import type { TextStyle } from 'react-native'

export const typography = {
  screenTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 32,
    lineHeight: 38,
  },
  sectionTitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  taskTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
  },
  body: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
} as const satisfies Record<string, TextStyle>
