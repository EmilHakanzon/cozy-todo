import { toDateString } from '@/lib/date-utils'

export type ParsedTodo = {
  title: string
  dueAt: string | null
  notes: string
  subtasks: string[]
  tags: string[]
}

export type SmartAddResult = {
  message: string
  todos: ParsedTodo[]
  usage?: { promptTokens: number; completionTokens: number }
}

export type ChatMessage = {
  role: 'user' | 'ai'
  text: string
  todos?: ParsedTodo[]
}

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? ''
const OPENAI_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `You are Planora's task planning assistant. Help the user plan their tasks through natural conversation.

Today's date: {{TODAY}}

Your job:
1. When the user describes tasks, parse them into structured data
2. When the user wants to refine, adjust the tasks based on their feedback
3. Be conversational and helpful — ask follow-up questions if something is unclear
4. Keep responses short and friendly (1-3 sentences max)

For dates: use ISO format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss for specific times.
"tomorrow" = the day after today, "next monday" = the coming monday, etc.
If no date is mentioned, set dueAt to null.

ALWAYS respond with valid JSON in this exact format, no markdown:
{
  "message": "Your conversational response to the user",
  "todos": [{"title":"string","dueAt":"string|null","notes":"string","subtasks":["string"],"tags":["string"]}]
}

The "todos" array should contain the CURRENT state of all tasks discussed so far.
If the user is just chatting or asking a question and no tasks are ready yet, return an empty todos array.
If the user says to change something, return the updated full list of tasks.

Tags: add 0-3 short lowercase tags per task. Reuse one of the user's existing
tags whenever it fits rather than inventing a near-duplicate. If nothing fits,
omit tags rather than inventing one.
The user's existing tags: {{TAGS}}`

export function formatOpenAIError(status: number, body: string): string {
  if (status === 429) {
    return 'Smart Add has reached its rate limit. Try again in a moment.'
  }

  if (status === 401) {
    return 'The Smart Add API key looks invalid. Check your configuration.'
  }

  let message = ''
  try {
    message = JSON.parse(body)?.error?.message ?? ''
  } catch {
    message = ''
  }

  return message !== '' ? message : 'Smart Add is unavailable right now.'
}

export function normalizeParsedTodos(raw: unknown): ParsedTodo[] {
  if (!Array.isArray(raw)) return []

  const todos: ParsedTodo[] = []
  for (const item of raw) {
    const title = typeof item?.title === 'string' ? item.title.trim() : ''
    if (title === '') continue

    todos.push({
      title,
      dueAt: typeof item.dueAt === 'string' ? item.dueAt : null,
      notes: typeof item.notes === 'string' ? item.notes : '',
      subtasks: Array.isArray(item.subtasks)
        ? item.subtasks.filter((s: unknown) => typeof s === 'string')
        : [],
      tags: Array.isArray(item.tags)
        ? item.tags.filter((t: unknown) => typeof t === 'string')
        : [],
    })
  }
  return todos
}

export async function smartAddChat(
  history: ChatMessage[],
  input: string,
  existingTagNames: string[] = [],
): Promise<SmartAddResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('Smart Add is not configured')
  }

  const today = toDateString(new Date())
  const systemPrompt = SYSTEM_PROMPT.replace('{{TODAY}}', today).replace(
    '{{TAGS}}',
    existingTagNames.length > 0 ? existingTagNames.join(', ') : '(none yet)',
  )

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map((msg) => ({
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content:
        msg.role === 'user'
          ? msg.text
          : JSON.stringify({ message: msg.text, todos: msg.todos ?? [] }),
    })),
    { role: 'user' as const, content: input },
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatOpenAIError(res.status, body))
  }

  const data = await res.json()
  const content: string = data.choices?.[0]?.message?.content ?? ''

  // A 200 can still carry no usable text -- a safety block, a recitation stop,
  // or a MAX_TOKENS cut mid-object. Without this the raw SyntaxError from
  // JSON.parse('') would be shown to the user as the chat reply.
  let parsed: SmartAddResult
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('Smart Add returned an unreadable response. Try again.')
  }

  if (!parsed.message) {
    parsed.message = ''
  }
  parsed.todos = normalizeParsedTodos(parsed.todos)

  if (data.usage) {
    parsed.usage = {
      promptTokens: data.usage.prompt_tokens ?? 0,
      completionTokens: data.usage.completion_tokens ?? 0,
    }
  }

  return parsed
}
