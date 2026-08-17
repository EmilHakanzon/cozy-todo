import type { Todo, TodoId } from '@/features/todos/types'

function getNotifications() {
  try {
    return require('expo-notifications') as typeof import('expo-notifications')
  } catch {
    return null
  }
}

function notificationId(todoId: TodoId): string {
  return `todo-${todoId}`
}

export function setupNotificationHandler(): void {
  const Notifications = getNotifications()
  if (!Notifications) return

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
  } catch {}
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = getNotifications()
  if (!Notifications) return false

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleTodoReminder(todo: Todo): Promise<void> {
  const Notifications = getNotifications()
  if (!Notifications) return

  if (!todo.dueAt) return

  const triggerDate = new Date(todo.dueAt)
  if (triggerDate.getTime() <= Date.now()) return

  await Notifications.cancelScheduledNotificationAsync(notificationId(todo.id))

  await Notifications.scheduleNotificationAsync({
    identifier: notificationId(todo.id),
    content: {
      title: todo.title,
      body: 'Task due now',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  })
}

export async function cancelTodoReminder(todoId: TodoId): Promise<void> {
  const Notifications = getNotifications()
  if (!Notifications) return

  await Notifications.cancelScheduledNotificationAsync(notificationId(todoId))
}

export async function cancelAllReminders(): Promise<void> {
  const Notifications = getNotifications()
  if (!Notifications) return

  await Notifications.cancelAllScheduledNotificationsAsync()
}

export async function rescheduleAllReminders(
  todosById: Record<TodoId, Todo>,
): Promise<void> {
  await cancelAllReminders()

  const now = Date.now()
  const promises = Object.values(todosById)
    .filter((todo) => !todo.completedAt && todo.dueAt && new Date(todo.dueAt).getTime() > now)
    .map((todo) => scheduleTodoReminder(todo))

  await Promise.all(promises)
}
