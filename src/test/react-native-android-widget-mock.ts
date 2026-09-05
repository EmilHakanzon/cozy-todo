// Minimal stand-in för react-native-android-widget i testmiljön.
// Riktiga modulen drar in react-native (Flow-syntax, native bindings) som
// varken node-miljön eller vitest/rolldown kan tolka.
// Aliasas i vitest.config.mts. Utöka med fler exports vid behov.
export function FlexWidget() {
  return null
}

export function ListWidget() {
  return null
}

export function TextWidget() {
  return null
}

export function requestWidgetUpdate() {}
