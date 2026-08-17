import { useState } from 'react'
import { View } from 'react-native'
import { SymbolView } from 'expo-symbols'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

import { useAppTheme } from '@/hooks/use-app-theme'
import { selection } from '@/lib/haptics'

import type { ReactNode } from 'react'
import type { SymbolViewProps } from 'expo-symbols'

const DRAG_HANDLE: SymbolViewProps['name'] = {
  ios: 'line.3.horizontal',
  android: 'drag_handle',
  web: 'drag_handle',
}

type DraggableTodoListProps<T> = {
  items: T[]
  keyExtractor: (item: T) => string
  renderItem: (item: T, index: number) => ReactNode
  onReorder: (fromIndex: number, toIndex: number) => void
  itemHeight: number
}

type DraggableItemProps = {
  index: number
  itemCount: number
  itemHeight: number
  onDragStart: () => void
  onDragEnd: (toIndex: number) => void
  onDragCancel: () => void
  children: ReactNode
}

function DraggableItem({
  index,
  itemCount,
  itemHeight,
  onDragStart,
  onDragEnd,
  onDragCancel,
  children,
}: DraggableItemProps) {
  const { theme } = useAppTheme()
  const translateY = useSharedValue(0)
  const isActive = useSharedValue(false)

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      isActive.value = true
      runOnJS(onDragStart)()
      runOnJS(selection)()
    })
    .onUpdate((event) => {
      translateY.value = event.translationY
    })
    .onEnd((event) => {
      const rawOffset = Math.round(event.translationY / itemHeight)
      const clampedIndex = Math.max(0, Math.min(itemCount - 1, index + rawOffset))
      translateY.value = withTiming(0, { duration: 200 })
      isActive.value = false
      runOnJS(onDragEnd)(clampedIndex)
    })
    .onFinalize(() => {
      if (isActive.value) {
        translateY.value = withTiming(0, { duration: 200 })
        isActive.value = false
        runOnJS(onDragCancel)()
      }
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: isActive.value ? 100 : 0,
    shadowOpacity: isActive.value ? 0.15 : 0,
    shadowRadius: isActive.value ? 8 : 0,
    shadowOffset: { width: 0, height: isActive.value ? 4 : 0 },
    shadowColor: '#000',
    elevation: isActive.value ? 8 : 0,
  }))

  return (
    <Animated.View style={animatedStyle}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>{children}</View>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={{
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.md,
              justifyContent: 'center',
            }}
          >
            <SymbolView name={DRAG_HANDLE} size={18} tintColor={theme.color.text2} />
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  )
}

export function DraggableTodoList<T>({
  items,
  keyExtractor,
  renderItem,
  onReorder,
  itemHeight,
}: DraggableTodoListProps<T>) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  return (
    <View>
      {items.map((item, index) => (
        <DraggableItem
          key={keyExtractor(item)}
          index={index}
          itemCount={items.length}
          itemHeight={itemHeight}
          onDragStart={() => setDraggingIndex(index)}
          onDragEnd={(toIndex) => {
            if (toIndex !== index) onReorder(index, toIndex)
            setDraggingIndex(null)
          }}
          onDragCancel={() => setDraggingIndex(null)}
        >
          {renderItem(item, index)}
        </DraggableItem>
      ))}
    </View>
  )
}
