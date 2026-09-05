'use no memo'

import React from 'react'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'

import { TodoTodayWidget } from './TodoTodayWidget'
import { readWidgetData } from './widget-data'

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await readWidgetData()
      props.renderWidget(<TodoTodayWidget data={data} />)
      break
    }
    case 'WIDGET_DELETED':
      break
    case 'WIDGET_CLICK': {
      const data = await readWidgetData()
      props.renderWidget(<TodoTodayWidget data={data} />)
      break
    }
  }
}
