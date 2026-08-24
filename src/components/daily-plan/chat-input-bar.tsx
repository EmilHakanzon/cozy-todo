import { SymbolView } from 'expo-symbols'
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const SPARKLE_ICON: SymbolViewProps['name'] = {
  ios: 'sparkles',
  android: 'auto_awesome',
  web: 'auto_awesome',
}
const SEND_ICON: SymbolViewProps['name'] = {
  ios: 'arrow.up.circle.fill',
  android: 'send',
  web: 'send',
}

type ChatInputBarProps = {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  isSending: boolean
  isKeyboardVisible: boolean
  placeholder: string
  inputRef: React.RefObject<TextInput | null>
}

export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  isSending,
  isKeyboardVisible,
  placeholder,
  inputRef,
}: ChatInputBarProps) {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xs,
        paddingBottom: isKeyboardVisible ? theme.spacing.xs : insets.bottom + theme.spacing.xs,
        backgroundColor: theme.color.background,
        borderTopWidth: 1,
        borderTopColor: theme.color.border,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          backgroundColor: theme.color.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.color.border,
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.xs,
          paddingVertical: theme.spacing.xs,
        }}
      >
        <SymbolView
          name={SPARKLE_ICON}
          size={18}
          tintColor={theme.color.accent}
          style={{ marginBottom: 8 }}
        />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.color.text2}
          multiline
          returnKeyType="default"
          editable={!isSending}
          style={{
            ...typography.body,
            flex: 1,
            color: theme.color.text,
            paddingHorizontal: theme.spacing.xs,
            paddingVertical: theme.spacing.micro,
            maxHeight: 100,
          }}
        />
        {isSending ? (
          <ActivityIndicator
            color={theme.color.accent}
            style={{ marginBottom: 6, marginRight: 4 }}
          />
        ) : (
          value.trim().length > 0 && (
            <Pressable
              onPress={onSend}
              hitSlop={8}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                marginBottom: 4,
              })}
            >
              <SymbolView name={SEND_ICON} size={28} tintColor={theme.color.accent} />
            </Pressable>
          )
        )}
      </View>
    </View>
  )
}
