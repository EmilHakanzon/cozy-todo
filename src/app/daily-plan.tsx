import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ChatEmptyState } from '@/components/daily-plan/chat-empty-state'
import { ChatHistorySheet } from '@/components/daily-plan/chat-history-sheet'
import { ChatInputBar } from '@/components/daily-plan/chat-input-bar'
import { ChatMessageBubble } from '@/components/daily-plan/chat-message-bubble'
import { PlanBacklogRow } from '@/components/daily-plan/plan-backlog-row'
import { PlanHero } from '@/components/daily-plan/plan-hero'
import { PlanSectionLabel } from '@/components/daily-plan/plan-section-label'
import { PlanTodoRow } from '@/components/daily-plan/plan-todo-row'
import {
  getActiveTodos,
  getAllRootTodos,
  getBacklogTodos,
  getOverdueTodos,
  getTodayTodos,
} from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useDailyPlanChat } from '@/hooks/use-daily-plan-chat'
import { useDailyPlanStore } from '@/stores/daily-plan-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const CLOSE_ICON: SymbolViewProps['name'] = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
}
const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark.circle.fill',
  android: 'check_circle',
  web: 'check_circle',
}
const CLEAR_ICON: SymbolViewProps['name'] = {
  ios: 'arrow.counterclockwise',
  android: 'refresh',
  web: 'refresh',
}
const HISTORY_ICON: SymbolViewProps['name'] = {
  ios: 'clock.arrow.circlepath',
  android: 'history',
  web: 'history',
}

export default function DailyPlanScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const timeFormat = useSettingsStore((s) => s.timeFormat)
  const hasHydrated = useDailyPlanStore((s) => s.hasHydrated)
  const setTaskTags = useDailyPlanStore((s) => s.setTaskTags)

  const {
    messages,
    draft,
    setDraft,
    isSending,
    error,
    successMsg,
    hasChatContent,
    latestTasks,
    send,
    createTasks,
    startNewChat,
  } = useDailyPlanChat()

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [historyVisible, setHistoryVisible] = useState(false)
  const chatScrollRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    const isIOS = Platform.OS === 'ios'
    const showSub = Keyboard.addListener(isIOS ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      setIsKeyboardVisible(true)
      // Same guard as onContentSizeChange: on a fresh screen there is nothing
      // to scroll to, and scrolling anyway pushes the hero card out of view.
      if (hasChatContent) {
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 50)
      }
    })
    const hideSub = Keyboard.addListener(isIOS ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setIsKeyboardVisible(false)
    )
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [hasChatContent])

  const allRootTodos = useMemo(() => getAllRootTodos(todosById), [todosById])
  const overdue = useMemo(() => getOverdueTodos(todosById), [todosById])
  const todayTodos = useMemo(() => getActiveTodos(getTodayTodos(allRootTodos)), [allRootTodos])
  const backlog = useMemo(() => getBacklogTodos(todosById).slice(0, 8), [todosById])

  const totalPlanned = todayTodos.length + overdue.length

  const handleTodoPress = useCallback(
    (id: string) => router.push({ pathname: '/todo/[todoId]', params: { todoId: id } }),
    []
  )

  const handleAddToToday = useCallback(
    (id: string) => {
      const today = new Date().toISOString().split('T')[0]
      updateTodo(id, { dueAt: today })
    },
    [updateTodo]
  )

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.color.background }}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View
        style={{
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xs,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {hasHydrated && hasChatContent ? (
          <Pressable
            onPress={startNewChat}
            hitSlop={8}
            style={({ pressed }) => ({
              opacity: pressed ? 0.5 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            })}
          >
            <SymbolView name={CLEAR_ICON} size={16} tintColor={theme.color.text2} />
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>New chat</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Pressable
            onPress={() => setHistoryVisible(true)}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <SymbolView name={HISTORY_ICON} size={20} tintColor={theme.color.text2} />
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <SymbolView name={CLOSE_ICON} size={20} tintColor={theme.color.text2} />
          </Pressable>
        </View>
      </View>

      <ChatHistorySheet visible={historyVisible} onClose={() => setHistoryVisible(false)} />

      <ScrollView
        ref={chatScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onContentSizeChange={() => {
          if (hasChatContent) {
            chatScrollRef.current?.scrollToEnd({ animated: true })
          }
        }}
      >
        {/* Hero greeting card */}
        <PlanHero totalPlanned={totalPlanned} />

        {hasHydrated && (
          <>
            {/* Chat messages */}
            {!hasChatContent && successMsg === '' && (
              <ChatEmptyState
                onPickExample={(text) => {
                  setDraft(text)
                  inputRef.current?.focus()
                }}
              />
            )}

            {successMsg !== '' && (
              <View
                style={{
                  marginHorizontal: theme.spacing.lg,
                  backgroundColor: theme.color.accentSoft,
                  borderRadius: theme.radius.lg,
                  padding: theme.spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  marginBottom: theme.spacing.md,
                }}
              >
                <SymbolView name={CHECK_ICON} size={20} tintColor={theme.color.accent} />
                <Text style={{ ...typography.body, color: theme.color.accent }}>{successMsg}</Text>
              </View>
            )}

            {messages.map((msg, i) => (
              <ChatMessageBubble
                key={i}
                message={msg}
                timeFormat={timeFormat}
                messageIndex={i}
                onChangeTags={setTaskTags}
              />
            ))}

            {isSending && (
              <View
                style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}
              >
                <View
                  style={{
                    backgroundColor: theme.color.surfaceSoft,
                    borderRadius: theme.radius.lg,
                    borderBottomLeftRadius: theme.radius.sm,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    alignSelf: 'flex-start',
                  }}
                >
                  <ActivityIndicator color={theme.color.accent} size="small" />
                </View>
              </View>
            )}

            {error !== '' && (
              <View
                style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}
              >
                <Text style={{ ...typography.meta, color: theme.color.overdue }}>{error}</Text>
              </View>
            )}

            {/* Create tasks button */}
            {latestTasks.length > 0 && !isSending && (
              <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xs }}>
                <Pressable
                  onPress={createTasks}
                  style={({ pressed }) => ({
                    backgroundColor: theme.color.accent,
                    borderRadius: theme.radius.md,
                    paddingVertical: theme.spacing.sm,
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      ...typography.body,
                      fontFamily: 'Manrope_600SemiBold',
                      color: '#ffffff',
                    }}
                  >
                    Create {latestTasks.length === 1 ? 'task' : `${latestTasks.length} tasks`}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {/* Overdue card */}
        {hasHydrated && overdue.length > 0 && !hasChatContent && (
          <View
            style={{
              marginHorizontal: theme.spacing.lg,
              marginTop: theme.spacing.md,
              marginBottom: theme.spacing.md,
            }}
          >
            <PlanSectionLabel label="OVERDUE" count={overdue.length} color={theme.color.overdue} />
            <View
              style={{
                backgroundColor: theme.color.surface,
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                borderColor: theme.color.overdue + '30',
                overflow: 'hidden',
              }}
            >
              {overdue.map((todo, i) => (
                <PlanTodoRow
                  key={todo.id}
                  todo={todo}
                  onToggle={toggleTodo}
                  onPress={handleTodoPress}
                  showBorder={i < overdue.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* Today card */}
        {hasHydrated && !hasChatContent && (
          <View
            style={{
              marginHorizontal: theme.spacing.lg,
              marginBottom: theme.spacing.md,
            }}
          >
            <PlanSectionLabel label="TODAY" count={todayTodos.length} color={theme.color.accent} />
            {todayTodos.length > 0 ? (
              <View
                style={{
                  backgroundColor: theme.color.surface,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: theme.color.border,
                  overflow: 'hidden',
                }}
              >
                {todayTodos.map((todo, i) => (
                  <PlanTodoRow
                    key={todo.id}
                    todo={todo}
                    onToggle={toggleTodo}
                    onPress={handleTodoPress}
                    showBorder={i < todayTodos.length - 1}
                  />
                ))}
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: theme.color.surface,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: theme.color.border,
                  padding: theme.spacing.lg,
                  alignItems: 'center',
                }}
              >
                <Text style={{ ...typography.body, color: theme.color.text2 }}>
                  Nothing scheduled yet
                </Text>
                <Text style={{ ...typography.meta, color: theme.color.text2, paddingTop: 2 }}>
                  Pick from your backlog or use Smart Add
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Backlog — pick tasks */}
        {hasHydrated && backlog.length > 0 && !hasChatContent && (
          <View style={{ marginHorizontal: theme.spacing.lg }}>
            <PlanSectionLabel
              label="ADD TO TODAY"
              count={backlog.length}
              color={theme.color.text2}
            />
            <View
              style={{
                backgroundColor: theme.color.surfaceSoft,
                borderRadius: theme.radius.lg,
                overflow: 'hidden',
              }}
            >
              {backlog.map((todo, i) => (
                <PlanBacklogRow
                  key={todo.id}
                  todo={todo}
                  onPress={handleTodoPress}
                  onAddToToday={handleAddToToday}
                  showBorder={i < backlog.length - 1}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <ChatInputBar
        value={draft}
        onChangeText={setDraft}
        onSend={send}
        isSending={isSending}
        isKeyboardVisible={isKeyboardVisible}
        placeholder={
          hasHydrated && hasChatContent ? 'Refine or add more...' : 'Describe your tasks...'
        }
        inputRef={inputRef}
      />
    </KeyboardAvoidingView>
  )
}
