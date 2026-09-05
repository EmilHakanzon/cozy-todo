'use no memo'

import React from 'react'
import { Platform } from 'react-native'
import { requestWidgetUpdate } from 'react-native-android-widget'
import { readWidgetData } from './widget-data'
import { TodoTodayWidget } from './TodoTodayWidget'

export function triggerWidgetUpdate() {
  if (Platform.OS !== 'android') return

  readWidgetData()
    .then((data) => {
      requestWidgetUpdate({
        widgetName: 'TodoToday',
        renderWidget: () => React.createElement(TodoTodayWidget, { data }),
      })
    })
    .catch(() => {})
}
