export const SchedulableTriggerInputTypes = { DATE: 'date' } as const

export async function getPermissionsAsync() {
  return { status: 'undetermined' }
}

export async function requestPermissionsAsync() {
  return { status: 'granted' }
}

export async function scheduleNotificationAsync() {
  return ''
}

export async function cancelScheduledNotificationAsync() {}

export async function cancelAllScheduledNotificationsAsync() {}

export function setNotificationHandler() {}
