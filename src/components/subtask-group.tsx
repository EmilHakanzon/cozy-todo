import { View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'

import type { ReactNode } from 'react'

type SubtaskGroupProps = {
  children: ReactNode[]
}

const LINE_WIDTH = 1
const CONNECTOR_LEFT = 10
const TICK_WIDTH = 10

export function SubtaskGroup({ children }: SubtaskGroupProps) {
  const { theme } = useAppTheme()
  const lineColor = theme.color.border

  if (children.length === 0) return null

  return (
    <View style={{ position: 'relative', marginLeft: CONNECTOR_LEFT }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: children.length === 1 ? '50%' : 0,
          width: LINE_WIDTH,
          backgroundColor: lineColor,
        }}
      />

      {children.map((child, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: TICK_WIDTH,
              height: LINE_WIDTH,
              backgroundColor: lineColor,
            }}
          />
          <View style={{ flex: 1 }}>{child}</View>
        </View>
      ))}
    </View>
  )
}
