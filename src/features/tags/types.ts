export type TagId = string

export const TAG_COLORS = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'gray',
] as const

export type TagColor = (typeof TAG_COLORS)[number]

export type Tag = {
  id: TagId
  name: string
  color: TagColor
  createdAt: string
}
