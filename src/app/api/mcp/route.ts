import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createTodoistTask } from '@/lib/todoist'

const DEFAULT_URL = 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTQ5MywiZXhwIjoyMDk3OTA1NDkzfQ.KaV1NcBeZRWTtYurPyRWqpuUpghk8wJWVK0CtqO4dA0'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

const VALID_MOODS = ['amazing', 'good', 'meh', 'bad', 'awful'] as const
type Mood = typeof VALID_MOODS[number]

function normalizeMood(raw: string | undefined | null): Mood {
  if (!raw) return 'good'
  const lower = raw.toLowerCase().trim()
  if (VALID_MOODS.includes(lower as Mood)) return lower as Mood
  const map: Record<string, Mood> = {
    '🚀': 'amazing', '🔥': 'amazing', '⚡': 'amazing', '😄': 'amazing', 'great': 'amazing', 'excellent': 'amazing',
    '😊': 'good', '🙂': 'good', '👍': 'good', 'ok': 'good',
    '😐': 'meh', '🤷': 'meh', 'neutral': 'meh',
    '😞': 'bad', '😔': 'bad', 'sad': 'bad', 'tired': 'bad',
    '😢': 'awful', '😭': 'awful', 'terrible': 'awful',
  }
  return map[lower] ?? 'good'
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
  return createClient(url, SERVICE_KEY || ANON_KEY)
}

// Helper to resolve record target ID or search query from args flexibly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTargetIdAndQuery(args: Record<string, any>, defaultIdKeys: string[]) {
  let targetId: string | undefined = undefined
  for (const key of ['id', ...defaultIdKeys]) {
    if (args[key] && typeof args[key] === 'string' && args[key].trim().length > 0) {
      targetId = args[key].trim()
      break
    }
  }
  const queryStr = (args.title || args.name || args.query || args.keyword || args.search || args.content) as string | undefined
  return { targetId, queryStr: queryStr?.trim() }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getUserIdFromRequest(req: NextRequest): Promise<string> {
  const supabase = getSupabase()
  const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key')

  if (authHeader) {
    const rawToken = authHeader.replace('Bearer ', '').trim()
    if (rawToken.startsWith('nir_')) {
      const { data: tokenRow } = await supabase
        .from('mcp_oauth_tokens')
        .select('user_id')
        .eq('access_token', rawToken)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()
      if (tokenRow?.user_id) return tokenRow.user_id
    }

    if (rawToken.length > 5) {
      const prefix = rawToken.slice(0, 12)
      const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken))
      const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
      const { data: keyRow } = await supabase
        .from('api_keys')
        .select('user_id')
        .eq('key_prefix', prefix)
        .eq('key_hash', hashHex)
        .is('revoked_at', null)
        .maybeSingle()
      if (keyRow?.user_id) return keyRow.user_id
    }
  }

  try {
    const { data: p } = await supabase.from('profiles').select('id').limit(1).single()
    if (p?.id) return p.id
  } catch {}

  return 'mcp-guest-user'
}

// ─── Full CRUD MCP Tool Definitions ───────────────────────────────────────────

const MCP_TOOLS = [
  // Dashboard & Profile
  {
    name: 'get_life_dashboard',
    description: 'Get full dashboard overview: life score, streak, active tasks, pending todos, water logs, and goals.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_user_analytics',
    description: 'Get deep user telemetry: completion rate, total tasks finished, water logs summary, journal entries count.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_profile',
    description: 'Get user profile information.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'update_profile',
    description: 'Update user profile (display_name, bio, timezone, phone).',
    inputSchema: {
      type: 'object',
      properties: { display_name: { type: 'string' }, bio: { type: 'string' }, timezone: { type: 'string' }, phone: { type: 'string' } },
      required: []
    }
  },

  // Life Areas
  {
    name: 'list_life_areas',
    description: 'List all life areas.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'create_life_area',
    description: 'Create a new life area.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' }, icon: { type: 'string' }, color: { type: 'string' }, target_score: { type: 'number' } },
      required: ['name']
    }
  },

  // Tasks & Subtasks (Full CRUD)
  {
    name: 'list_tasks',
    description: 'List tasks. Filter by status: todo, in_progress, done.',
    inputSchema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['todo', 'in_progress', 'done'] }, limit: { type: 'number' } },
      required: []
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task. Priority: 1=low, 2=med, 3=high, 4=urgent.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'number', enum: [1, 2, 3, 4] }, due_date: { type: 'string' }, goal_id: { type: 'string' } },
      required: ['title']
    }
  },
  {
    name: 'create_task_with_subtasks',
    description: 'Create a parent task with an array of subtasks.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, priority: { type: 'number', enum: [1, 2, 3, 4] }, subtasks: { type: 'array', items: { type: 'string' } } },
      required: ['title', 'subtasks']
    }
  },
  {
    name: 'update_task',
    description: 'Update an existing task by ID or title.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, task_id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'number' }, status: { type: 'string' }, due_date: { type: 'string' } },
      required: []
    }
  },
  {
    name: 'complete_task',
    description: 'Mark a task as done by ID or title.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, task_id: { type: 'string' }, title: { type: 'string' } },
      required: []
    }
  },
  {
    name: 'delete_task',
    description: 'Delete task(s) by ID, title keyword, or query.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, task_id: { type: 'string' }, title: { type: 'string' }, query: { type: 'string' } },
      required: []
    }
  },
  {
    name: 'delete_all_tasks',
    description: 'Delete ALL tasks for the user.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Todos (Full CRUD)
  {
    name: 'list_todos',
    description: 'List daily checklist todos.',
    inputSchema: { type: 'object', properties: { is_done: { type: 'boolean' } }, required: [] }
  },
  {
    name: 'create_todo',
    description: 'Add a single daily todo item.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, due_date: { type: 'string' } },
      required: ['title']
    }
  },
  {
    name: 'batch_add_todos',
    description: 'Add multiple todo items at once in bulk.',
    inputSchema: {
      type: 'object',
      properties: { titles: { type: 'array', items: { type: 'string' } } },
      required: ['titles']
    }
  },
  {
    name: 'update_todo',
    description: 'Update a todo item by ID or title.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, todo_id: { type: 'string' }, title: { type: 'string' }, is_done: { type: 'boolean' } },
      required: []
    }
  },
  {
    name: 'complete_todo',
    description: 'Mark a todo item as complete by ID or title.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, todo_id: { type: 'string' }, title: { type: 'string' } },
      required: []
    }
  },
  {
    name: 'delete_todo',
    description: 'Delete todo item(s) by ID or title keyword.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, todo_id: { type: 'string' }, title: { type: 'string' }, query: { type: 'string' } },
      required: []
    }
  },
  {
    name: 'delete_all_todos',
    description: 'Delete ALL daily checklist todos.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Health & Water Intake
  {
    name: 'get_today_water_intake',
    description: 'Get today total water intake logs.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'log_water_intake',
    description: 'Log water consumption in ml (e.g. 100, 200, 250, 500).',
    inputSchema: {
      type: 'object',
      properties: { amount_ml: { type: 'number' } },
      required: ['amount_ml']
    }
  },
  {
    name: 'reset_today_water_logs',
    description: 'Clear today water intake logs.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Reminders
  {
    name: 'list_reminders',
    description: 'List scheduled reminders.',
    inputSchema: { type: 'object', properties: { is_sent: { type: 'boolean' } }, required: [] }
  },
  {
    name: 'create_reminder',
    description: 'Set a reminder alert.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, remind_at: { type: 'string' }, is_recurring: { type: 'boolean' }, recurrence_rule: { type: 'string' } },
      required: ['title']
    }
  },
  {
    name: 'update_reminder',
    description: 'Update a reminder by ID or title.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, reminder_id: { type: 'string' }, title: { type: 'string' }, remind_at: { type: 'string' }, is_sent: { type: 'boolean' } },
      required: []
    }
  },
  {
    name: 'delete_reminder',
    description: 'Delete reminder(s) by ID or title keyword.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, reminder_id: { type: 'string' }, title: { type: 'string' }, query: { type: 'string' } },
      required: []
    }
  },
  {
    name: 'delete_all_reminders',
    description: 'Delete ALL reminders for the user.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Journal
  {
    name: 'list_journal_entries',
    description: 'List journal entries.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } }, required: [] }
  },
  {
    name: 'create_journal_entry',
    description: 'Write a journal entry.',
    inputSchema: {
      type: 'object',
      properties: { content: { type: 'string' }, mood: { type: 'string', enum: ['amazing', 'good', 'meh', 'bad', 'awful'] }, title: { type: 'string' } },
      required: ['content']
    }
  },
  {
    name: 'delete_journal_entry',
    description: 'Delete journal entry matching ID, title, or content.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, title: { type: 'string' }, query: { type: 'string' } },
      required: []
    }
  },
  {
    name: 'delete_all_journal_entries',
    description: 'Delete ALL journal entries.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Goals
  {
    name: 'list_goals',
    description: 'List life goals.',
    inputSchema: { type: 'object', properties: { status: { type: 'string' } }, required: [] }
  },
  {
    name: 'create_goal',
    description: 'Create a new life goal.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'number' }, target_date: { type: 'string' } },
      required: ['title']
    }
  },
  {
    name: 'update_goal',
    description: 'Update a goal by ID or title.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, goal_id: { type: 'string' }, title: { type: 'string' }, status: { type: 'string' }, description: { type: 'string' } },
      required: []
    }
  },
  {
    name: 'delete_goal',
    description: 'Delete goal(s) by ID or title keyword.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, goal_id: { type: 'string' }, title: { type: 'string' }, query: { type: 'string' } },
      required: []
    }
  },
  {
    name: 'delete_all_goals',
    description: 'Delete ALL goals.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Habits
  {
    name: 'list_habits',
    description: 'List habits.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'create_habit',
    description: 'Create a new habit.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' }, frequency: { type: 'string' }, color: { type: 'string' } },
      required: ['name']
    }
  },
  {
    name: 'log_habit_completion',
    description: 'Log completion for a habit by ID or name.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, habit_id: { type: 'string' }, name: { type: 'string' }, note: { type: 'string' } },
      required: []
    }
  },
  {
    name: 'delete_habit',
    description: 'Delete habit(s) by ID or name keyword.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, habit_id: { type: 'string' }, name: { type: 'string' }, query: { type: 'string' } },
      required: []
    }
  },
  {
    name: 'delete_all_habits',
    description: 'Delete ALL habits.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Notes
  {
    name: 'list_notes',
    description: 'List notes.',
    inputSchema: { type: 'object', properties: { is_pinned: { type: 'boolean' } }, required: [] }
  },
  {
    name: 'create_note',
    description: 'Create a new note.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, content: { type: 'string' }, is_pinned: { type: 'boolean' } },
      required: ['content']
    }
  },
  {
    name: 'delete_note',
    description: 'Delete note(s) by ID or keyword.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, note_id: { type: 'string' }, title: { type: 'string' }, query: { type: 'string' } },
      required: []
    }
  },
  {
    name: 'delete_all_notes',
    description: 'Delete ALL notes.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Learning Hub
  {
    name: 'list_courses',
    description: 'List courses and modules.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'create_course',
    description: 'Create a learning course.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, description: { type: 'string' }, category: { type: 'string' } },
      required: ['title']
    }
  },
  {
    name: 'create_module',
    description: 'Create a module in a course.',
    inputSchema: {
      type: 'object',
      properties: { course_id: { type: 'string' }, course_title: { type: 'string' }, title: { type: 'string' } },
      required: ['title']
    }
  },
  {
    name: 'create_lesson',
    description: 'Create a lesson in a module.',
    inputSchema: {
      type: 'object',
      properties: { module_id: { type: 'string' }, module_title: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' }, resource_url: { type: 'string' } },
      required: ['title']
    }
  },
  {
    name: 'mark_lesson_complete',
    description: 'Mark a lesson completed by ID or title.',
    inputSchema: {
      type: 'object',
      properties: { lesson_id: { type: 'string' }, title: { type: 'string' } },
      required: []
    }
  },

  // Full Data Reset
  {
    name: 'full_data_reset',
    description: 'Wipe ALL user data across tasks, todos, habits, notes, journal, goals, water, and reminders in one command.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  }
]

function mcpOk(id: unknown, text: string) {
  return NextResponse.json(
    { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } },
    { headers: CORS_HEADERS }
  )
}

function mcpError(id: unknown, code: number, message: string) {
  return NextResponse.json(
    { jsonrpc: '2.0', id, error: { code, message } },
    { headers: CORS_HEADERS }
  )
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

function parseISOOrFallback(inputDateStr?: string): string {
  if (!inputDateStr || typeof inputDateStr !== 'string' || !inputDateStr.trim()) {
    return new Date(Date.now() + 3600000).toISOString()
  }

  const trimmed = inputDateStr.trim()
  let d = new Date(trimmed)

  if (isNaN(d.getTime())) {
    d = new Date(trimmed.replace(' ', 'T'))
  }

  if (isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    d = new Date(`${trimmed}T09:00:00`)
  }

  if (isNaN(d.getTime())) {
    return new Date(Date.now() + 3600000).toISOString()
  }

  return d.toISOString()
}

// ─── Tool Execution Handlers ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTool(toolName: string, args: Record<string, any>, userId: string, id: unknown): Promise<NextResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabase() as any

  // ── Dashboard & Profile ──
  if (toolName === 'get_life_dashboard') {
    const today = new Date().toISOString().split('T')[0]
    const [profileRes, tasksRes, todosRes, waterRes] = await Promise.all([
      db.from('profiles').select('display_name, username, life_score, current_streak, longest_streak').eq('id', userId).maybeSingle(),
      db.from('tasks').select('id, title, priority, status, due_date').eq('user_id', userId).neq('status', 'done').order('priority', { ascending: false }).limit(5),
      db.from('todos').select('id, title, is_done').eq('user_id', userId).eq('is_done', false).order('created_at', { ascending: false }).limit(5),
      db.from('water_logs').select('amount_ml').eq('user_id', userId).eq('date', today)
    ])

    const p = profileRes.data as Record<string, unknown> | null
    const totalWater = (waterRes.data || []).reduce((acc: number, curr: { amount_ml: number }) => acc + (curr.amount_ml || 0), 0)

    return mcpOk(id, JSON.stringify({
      user: {
        name: p?.display_name || p?.username || 'Builder',
        life_score: p?.life_score ?? 0,
        current_streak: p?.current_streak ?? 0,
      },
      active_tasks: tasksRes.data || [],
      pending_todos: todosRes.data || [],
      today_water_ml: totalWater,
    }, null, 2))
  }

  if (toolName === 'get_user_analytics') {
    const [tasksRes, todosRes, journalRes] = await Promise.all([
      db.from('tasks').select('status').eq('user_id', userId),
      db.from('todos').select('is_done').eq('user_id', userId),
      db.from('journal_entries').select('id').eq('user_id', userId),
    ])

    const allTasks = tasksRes.data || []
    const doneTasks = allTasks.filter((t: { status: string }) => t.status === 'done').length
    const allTodos = todosRes.data || []
    const doneTodos = allTodos.filter((t: { is_done: boolean }) => t.is_done).length

    return mcpOk(id, JSON.stringify({
      total_tasks: allTasks.length,
      tasks_completed: doneTasks,
      total_todos: allTodos.length,
      todos_completed: doneTodos,
      total_journal_entries: (journalRes.data || []).length,
    }, null, 2))
  }

  if (toolName === 'get_profile') {
    const { data } = await db.from('profiles').select('*').eq('id', userId).maybeSingle()
    return mcpOk(id, JSON.stringify(data || {}, null, 2))
  }

  if (toolName === 'update_profile') {
    const updates: Record<string, unknown> = {}
    if (args.display_name) updates.display_name = args.display_name
    if (args.bio) updates.bio = args.bio
    if (args.timezone) updates.timezone = args.timezone
    if (args.phone) updates.phone = args.phone
    await db.from('profiles').update(updates).eq('id', userId)
    return mcpOk(id, `✅ Profile updated successfully.`)
  }

  // ── Life Areas ──
  if (toolName === 'list_life_areas') {
    const { data } = await db.from('life_areas').select('*').eq('user_id', userId)
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  if (toolName === 'create_life_area') {
    const { data, error } = await db.from('life_areas').insert({
      user_id: userId,
      name: args.name.trim(),
      icon: args.icon || '⭐',
      color: args.color || '#34D399',
      target_score: args.target_score || 80,
    }).select().single()
    if (error) return mcpError(id, -32603, `Failed to create life area: ${error.message}`)
    return mcpOk(id, `⭐ Life area "${data.name}" created!`)
  }

  // ── Tasks ──
  if (toolName === 'list_tasks') {
    let query = db.from('tasks').select('id, title, priority, status, due_date, description').eq('user_id', userId).limit(args.limit || 30)
    if (args.status) query = query.eq('status', args.status)
    const { data } = await query
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  if (toolName === 'create_task') {
    const { data, error } = await db.from('tasks').insert({
      user_id: userId,
      title: args.title.trim(),
      priority: args.priority || 3,
      due_date: args.due_date || null,
      description: args.description || null,
      goal_id: args.goal_id || null,
      status: 'todo',
    }).select('id, title, priority, status').single()
    if (error) return mcpError(id, -32603, `Failed to create task: ${error.message}`)
    createTodoistTask(args.title.trim(), args.description || undefined, args.due_date || undefined, undefined, args.priority || 3).catch(() => {})
    return mcpOk(id, `✅ Task created & synced to Todoist: "${data.title}" (ID: ${data.id})`)
  }

  if (toolName === 'create_task_with_subtasks') {
    const { data: parentTask, error } = await db.from('tasks').insert({
      user_id: userId,
      title: args.title.trim(),
      priority: args.priority || 3,
      status: 'todo',
    }).select('id, title').single()

    if (error) return mcpError(id, -32603, `Failed to create parent task: ${error.message}`)

    const subtasksCreated = []
    for (const subTitle of (args.subtasks || [])) {
      const { data: sub } = await db.from('tasks').insert({
        user_id: userId,
        parent_task_id: parentTask.id,
        title: String(subTitle).trim(),
        priority: Math.max(1, (args.priority || 3) - 1),
        status: 'todo'
      }).select('id, title').single()
      if (sub) subtasksCreated.push(sub.title)
    }

    return mcpOk(id, `✅ Created Task "${parentTask.title}" with ${subtasksCreated.length} subtasks!`)
  }

  if (toolName === 'update_task') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['task_id'])
    const updates: Record<string, unknown> = {}
    if (args.title) updates.title = args.title
    if (args.description) updates.description = args.description
    if (args.priority) updates.priority = args.priority
    if (args.status) updates.status = args.status
    if (args.due_date) updates.due_date = args.due_date

    if (targetId) {
      await db.from('tasks').update(updates).eq('user_id', userId).eq('id', targetId)
      return mcpOk(id, `✅ Updated task ID "${targetId}".`)
    }
    if (queryStr) {
      const { data: found } = await db.from('tasks').select('id').eq('user_id', userId).ilike('title', `%${queryStr}%`)
      if (found && found.length > 0) {
        await db.from('tasks').update(updates).eq('user_id', userId).in('id', found.map((t: { id: string }) => t.id))
        return mcpOk(id, `✅ Updated ${found.length} task(s) matching "${queryStr}".`)
      }
    }
    return mcpError(id, -32602, `Please provide task ID or title to update.`)
  }

  if (toolName === 'complete_task') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['task_id'])
    if (targetId) {
      await db.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('user_id', userId).eq('id', targetId)
      return mcpOk(id, `🎉 Task ID "${targetId}" marked complete.`)
    }
    if (queryStr) {
      const { data: found } = await db.from('tasks').select('id, title').eq('user_id', userId).ilike('title', `%${queryStr}%`)
      if (found && found.length > 0) {
        await db.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('user_id', userId).in('id', found.map((t: { id: string }) => t.id))
        return mcpOk(id, `🎉 Marked ${found.length} task(s) matching "${queryStr}" complete.`)
      }
    }
    return mcpError(id, -32602, `Please specify task ID or title to complete.`)
  }

  if (toolName === 'delete_task') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['task_id'])

    if (targetId) {
      const { error } = await db.from('tasks').delete().eq('user_id', userId).eq('id', targetId)
      if (error) return mcpError(id, -32603, `Failed to delete task: ${error.message}`)
      return mcpOk(id, `🗑️ Task ID "${targetId}" deleted successfully.`)
    }

    if (queryStr) {
      if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
        await db.from('tasks').delete().eq('user_id', userId)
        return mcpOk(id, `🗑️ All tasks deleted successfully.`)
      }
      const { data: found } = await db.from('tasks').select('id, title').eq('user_id', userId).ilike('title', `%${queryStr}%`)
      if (!found || found.length === 0) {
        return mcpOk(id, `No task found matching "${queryStr}".`)
      }
      const ids = found.map((t: { id: string }) => t.id)
      await db.from('tasks').delete().in('id', ids)
      return mcpOk(id, `🗑️ Deleted ${found.length} task(s) matching "${queryStr}".`)
    }

    const { data: allUserTasks } = await db.from('tasks').select('id, title').eq('user_id', userId).limit(5)
    if (!allUserTasks || allUserTasks.length === 0) return mcpOk(id, `No tasks exist to delete.`)
    return mcpOk(id, `Please specify a task ID or title to delete.`)
  }

  if (toolName === 'delete_all_tasks') {
    await db.from('tasks').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All tasks deleted successfully!`)
  }

  // ── Todos ──
  if (toolName === 'list_todos') {
    let query = db.from('todos').select('id, title, is_done, due_date').eq('user_id', userId)
    if (args.is_done !== undefined) query = query.eq('is_done', args.is_done)
    const { data } = await query
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  if (toolName === 'create_todo') {
    const { data, error } = await db.from('todos').insert({
      user_id: userId,
      title: args.title.trim(),
      is_done: false,
      due_date: args.due_date || null,
    }).select('id, title').single()
    if (error) return mcpError(id, -32603, `Failed to create todo: ${error.message}`)
    createTodoistTask(args.title.trim(), undefined, args.due_date || undefined).catch(() => {})
    return mcpOk(id, `☑️ Todo created & synced to Todoist: "${data.title}" (ID: ${data.id})`)
  }

  if (toolName === 'batch_add_todos') {
    const added = []
    for (const title of (args.titles || [])) {
      const { data } = await db.from('todos').insert({
        user_id: userId,
        title: String(title).trim(),
        is_done: false,
      }).select('title').single()
      if (data) added.push(data.title)
    }
    return mcpOk(id, `☑️ Batch imported ${added.length} todos!`)
  }

  if (toolName === 'complete_todo' || toolName === 'update_todo') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['todo_id'])
    const isDone = args.is_done !== undefined ? args.is_done : true
    if (targetId) {
      await db.from('todos').update({ is_done: isDone }).eq('user_id', userId).eq('id', targetId)
      return mcpOk(id, `☑️ Todo ID "${targetId}" updated.`)
    }
    if (queryStr) {
      const { data: found } = await db.from('todos').select('id').eq('user_id', userId).ilike('title', `%${queryStr}%`)
      if (found && found.length > 0) {
        await db.from('todos').update({ is_done: isDone }).eq('user_id', userId).in('id', found.map((t: { id: string }) => t.id))
        return mcpOk(id, `☑️ Updated ${found.length} todo item(s) matching "${queryStr}".`)
      }
    }
    return mcpError(id, -32602, `Please specify todo ID or title to update.`)
  }

  if (toolName === 'delete_todo') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['todo_id'])

    if (targetId) {
      await db.from('todos').delete().eq('user_id', userId).eq('id', targetId)
      return mcpOk(id, `🗑️ Deleted todo item ID "${targetId}".`)
    }

    if (queryStr) {
      if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
        await db.from('todos').delete().eq('user_id', userId)
        return mcpOk(id, `🗑️ All daily todos cleared.`)
      }
      const { data: found } = await db.from('todos').select('id, title').eq('user_id', userId).ilike('title', `%${queryStr}%`)
      if (!found || found.length === 0) return mcpOk(id, `No todo item found matching "${queryStr}".`)
      const ids = found.map((t: { id: string }) => t.id)
      await db.from('todos').delete().in('id', ids)
      return mcpOk(id, `🗑️ Deleted ${found.length} todo item(s) matching "${queryStr}".`)
    }

    const { data: allUserTodos } = await db.from('todos').select('id, title').eq('user_id', userId).limit(5)
    if (!allUserTodos || allUserTodos.length === 0) return mcpOk(id, `No todos exist to delete.`)
    return mcpOk(id, `Please specify a todo ID or title to delete.`)
  }

  if (toolName === 'delete_all_todos') {
    await db.from('todos').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All daily checklist todo items deleted!`)
  }

  // ── Health & Water Intake ──
  if (toolName === 'get_today_water_intake') {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await db.from('water_logs').select('amount_ml, logged_at').eq('user_id', userId).eq('date', today)
    const total = (data || []).reduce((acc: number, curr: { amount_ml: number }) => acc + (curr.amount_ml || 0), 0)
    return mcpOk(id, JSON.stringify({ total_water_ml: total, logs: data || [] }, null, 2))
  }

  if (toolName === 'log_water_intake') {
    const today = new Date().toISOString().split('T')[0]
    const { error } = await db.from('water_logs').insert({
      user_id: userId,
      amount_ml: Number(args.amount_ml) || 250,
      date: today,
    })
    if (error) return mcpError(id, -32603, `Failed to log water: ${error.message}`)
    return mcpOk(id, `💧 Logged +${args.amount_ml || 250}ml water!`)
  }

  if (toolName === 'reset_today_water_logs') {
    const today = new Date().toISOString().split('T')[0]
    await db.from('water_logs').delete().eq('user_id', userId).eq('date', today)
    return mcpOk(id, `💧 Today's water intake logs reset to 0ml!`)
  }

  // ── Reminders ──
  if (toolName === 'list_reminders') {
    let query = db.from('reminders').select('*').eq('user_id', userId).order('remind_at', { ascending: true })
    if (args.is_sent !== undefined) query = query.eq('is_sent', args.is_sent)
    const { data } = await query
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  if (toolName === 'create_reminder') {
    const parsedDate = parseISOOrFallback(args.remind_at as string | undefined)
    const { error } = await db.from('reminders').insert({
      user_id: userId,
      title: args.title.trim(),
      remind_at: parsedDate,
      repeat_rule: args.repeat_rule || args.recurrence_rule || null,
      is_sent: false,
    })
    if (error) return mcpError(id, -32603, `Failed to create reminder: ${error.message}`)
    return mcpOk(id, `🔔 Reminder scheduled: "${args.title}" for ${parsedDate}`)
  }

  if (toolName === 'update_reminder') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['reminder_id'])
    const updates: Record<string, unknown> = {}
    if (args.title) updates.title = args.title
    if (args.remind_at) updates.remind_at = args.remind_at
    if (args.is_sent !== undefined) updates.is_sent = args.is_sent

    if (targetId) {
      await db.from('reminders').update(updates).eq('user_id', userId).eq('id', targetId)
      return mcpOk(id, `🔔 Reminder ID "${targetId}" updated.`)
    }
    if (queryStr) {
      const { data: found } = await db.from('reminders').select('id').eq('user_id', userId).ilike('title', `%${queryStr}%`)
      if (found && found.length > 0) {
        await db.from('reminders').update(updates).eq('user_id', userId).in('id', found.map((r: { id: string }) => r.id))
        return mcpOk(id, `🔔 Updated ${found.length} reminder(s) matching "${queryStr}".`)
      }
    }
    return mcpError(id, -32602, `Please specify reminder ID or title to update.`)
  }

  if (toolName === 'delete_reminder') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['reminder_id'])
    if (targetId) {
      await db.from('reminders').delete().eq('user_id', userId).eq('id', targetId)
      return mcpOk(id, `🗑️ Deleted reminder ID "${targetId}".`)
    }
    if (queryStr) {
      if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
        await db.from('reminders').delete().eq('user_id', userId)
        return mcpOk(id, `🗑️ All reminders deleted.`)
      }
      const { data: found } = await db.from('reminders').select('id, title').eq('user_id', userId).ilike('title', `%${queryStr}%`)
      if (!found || found.length === 0) return mcpOk(id, `No reminder found matching "${queryStr}".`)
      const ids = found.map((r: { id: string }) => r.id)
      await db.from('reminders').delete().in('id', ids)
      return mcpOk(id, `🗑️ Deleted ${found.length} reminder(s) matching "${queryStr}".`)
    }
    return mcpError(id, -32602, `Please specify reminder ID or title to delete.`)
  }

  if (toolName === 'delete_all_reminders') {
    await db.from('reminders').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All reminders deleted!`)
  }

  // ── Journal ──
  if (toolName === 'list_journal_entries') {
    const { data } = await db.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(args.limit || 20)
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  if (toolName === 'create_journal_entry') {
    const mood = normalizeMood(args.mood)
    const { data, error } = await db.from('journal_entries').insert({
      user_id: userId,
      title: args.title?.trim() || null,
      content: args.content.trim(),
      mood,
      entry_type: 'free',
      tags: [],
    }).select('id, content, mood').single()
    if (error) return mcpError(id, -32603, `Failed to create journal entry: ${error.message}`)
    return mcpOk(id, `📝 Journal entry saved! (Mood: ${data.mood})`)
  }

  if (toolName === 'delete_journal_entry') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['journal_id'])
    if (targetId) {
      await db.from('journal_entries').delete().eq('user_id', userId).eq('id', targetId)
      return mcpOk(id, `🗑️ Deleted journal entry ID "${targetId}".`)
    }
    if (queryStr) {
      if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
        await db.from('journal_entries').delete().eq('user_id', userId)
        return mcpOk(id, `🗑️ All journal entries deleted.`)
      }
      const { data: found } = await db.from('journal_entries').select('id, title, content').eq('user_id', userId).or(`title.ilike.%${queryStr}%,content.ilike.%${queryStr}%`)
      if (!found || found.length === 0) return mcpOk(id, `No journal entry found matching "${queryStr}".`)
      const ids = found.map((e: { id: string }) => e.id)
      await db.from('journal_entries').delete().in('id', ids)
      return mcpOk(id, `🗑️ Deleted ${found.length} journal entry(s) matching "${queryStr}".`)
    }
    return mcpError(id, -32602, `Please specify journal entry ID or keyword to delete.`)
  }

  if (toolName === 'delete_all_journal_entries') {
    await db.from('journal_entries').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All journal entries deleted!`)
  }

  // ── Goals ──
  if (toolName === 'list_goals') {
    let query = db.from('goals').select('*').eq('user_id', userId).order('priority', { ascending: false })
    if (args.status) query = query.eq('status', args.status)
    const { data } = await query
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  if (toolName === 'create_goal') {
    const { data, error } = await db.from('goals').insert({
      user_id: userId,
      title: args.title.trim(),
      description: args.description || null,
      status: 'active',
      priority: args.priority || 2,
      target_date: args.target_date || null,
    }).select('id, title').single()
    if (error) return mcpError(id, -32603, `Failed to create goal: ${error.message}`)
    return mcpOk(id, `🎯 Goal created: "${data.title}"`)
  }

  if (toolName === 'update_goal' || toolName === 'complete_goal') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['goal_id'])
    const status = args.status || 'completed'
    if (targetId) {
      await db.from('goals').update({ status }).eq('user_id', userId).eq('id', targetId)
      return mcpOk(id, `🎯 Goal ID "${targetId}" updated to ${status}.`)
    }
    if (queryStr) {
      const { data: found } = await db.from('goals').select('id').eq('user_id', userId).ilike('title', `%${queryStr}%`)
      if (found && found.length > 0) {
        await db.from('goals').update({ status }).eq('user_id', userId).in('id', found.map((g: { id: string }) => g.id))
        return mcpOk(id, `🎯 Updated ${found.length} goal(s) matching "${queryStr}".`)
      }
    }
    return mcpError(id, -32602, `Please specify goal ID or title to update.`)
  }

  if (toolName === 'delete_goal') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['goal_id'])
    if (targetId) {
      await db.from('goals').delete().eq('user_id', userId).eq('id', targetId)
      return mcpOk(id, `🗑️ Deleted goal ID "${targetId}".`)
    }
    if (queryStr) {
      if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
        await db.from('goals').delete().eq('user_id', userId)
        return mcpOk(id, `🗑️ All goals deleted.`)
      }
      const { data: found } = await db.from('goals').select('id, title').eq('user_id', userId).ilike('title', `%${queryStr}%`)
      if (!found || found.length === 0) return mcpOk(id, `No goal found matching "${queryStr}".`)
      const ids = found.map((g: { id: string }) => g.id)
      await db.from('goals').delete().in('id', ids)
      return mcpOk(id, `🗑️ Deleted ${found.length} goal(s) matching "${queryStr}".`)
    }
    return mcpError(id, -32602, `Please specify goal ID or title to delete.`)
  }

  if (toolName === 'delete_all_goals') {
    await db.from('goals').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All goals deleted!`)
  }

  // ── Habits ──
  if (toolName === 'list_habits') {
    const { data } = await db.from('habits').select('*').eq('user_id', userId).eq('archived', false)
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  if (toolName === 'create_habit') {
    const { data, error } = await db.from('habits').insert({
      user_id: userId,
      name: args.name.trim(),
      frequency: args.frequency || 'daily',
      color: args.color || '#34D399',
      target_count: 1,
      archived: false,
    }).select('id, name').single()
    if (error) return mcpError(id, -32603, `Failed to create habit: ${error.message}`)
    return mcpOk(id, `🔥 Habit created: "${data.name}"`)
  }

  if (toolName === 'log_habit_completion') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['habit_id'])
    let habitId = targetId
    if (!habitId && queryStr) {
      const { data: h } = await db.from('habits').select('id').eq('user_id', userId).ilike('name', `%${queryStr}%`).maybeSingle()
      if (h) habitId = h.id
    }
    if (!habitId) return mcpError(id, -32602, `Habit not found to log completion.`)

    const today = new Date().toISOString().split('T')[0]
    await db.from('habit_logs').insert({
      habit_id: habitId,
      user_id: userId,
      logged_at: today,
      count: 1,
      note: args.note || null,
    })
    return mcpOk(id, `🔥 Habit completion logged for today!`)
  }

  if (toolName === 'delete_habit') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['habit_id'])
    if (targetId) {
      await db.from('habits').delete().eq('user_id', userId).eq('id', targetId)
      return mcpOk(id, `🗑️ Deleted habit ID "${targetId}".`)
    }
    if (queryStr) {
      if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
        await db.from('habits').delete().eq('user_id', userId)
        return mcpOk(id, `🗑️ All habits deleted.`)
      }
      const { data: found } = await db.from('habits').select('id, name').eq('user_id', userId).ilike('name', `%${queryStr}%`)
      if (!found || found.length === 0) return mcpOk(id, `No habit found matching "${queryStr}".`)
      const ids = found.map((h: { id: string }) => h.id)
      await db.from('habits').delete().in('id', ids)
      return mcpOk(id, `🗑️ Deleted ${found.length} habit(s) matching "${queryStr}".`)
    }
    return mcpError(id, -32602, `Please specify habit ID or name to delete.`)
  }

  if (toolName === 'delete_all_habits') {
    await db.from('habits').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All habits deleted!`)
  }

  // ── Notes ──
  if (toolName === 'list_notes') {
    let query = db.from('notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
    if (args.is_pinned !== undefined) query = query.eq('is_pinned', args.is_pinned)
    const { data } = await query
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  if (toolName === 'create_note') {
    const { data: note, error } = await db.from('notes').insert({
      user_id: userId,
      title: args.title?.trim() || null,
      content: args.content.trim(),
      is_pinned: args.is_pinned || false,
    }).select('id, title').single()
    if (error) return mcpError(id, -32603, `Failed to create note: ${error.message}`)
    return mcpOk(id, `📝 Note saved: "${note.title || 'Untitled note'}"`)
  }

  if (toolName === 'delete_note') {
    const { targetId, queryStr } = extractTargetIdAndQuery(args, ['note_id'])
    if (targetId) {
      await db.from('notes').delete().eq('user_id', userId).eq('id', targetId)
      return mcpOk(id, `🗑️ Deleted note ID "${targetId}".`)
    }
    if (queryStr) {
      if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
        await db.from('notes').delete().eq('user_id', userId)
        return mcpOk(id, `🗑️ All notes deleted.`)
      }
      const { data: found } = await db.from('notes').select('id, title, content').eq('user_id', userId).or(`title.ilike.%${queryStr}%,content.ilike.%${queryStr}%`)
      if (!found || found.length === 0) return mcpOk(id, `No note found matching "${queryStr}".`)
      const ids = found.map((n: { id: string }) => n.id)
      await db.from('notes').delete().in('id', ids)
      return mcpOk(id, `🗑️ Deleted ${found.length} note(s) matching "${queryStr}".`)
    }
    return mcpError(id, -32602, `Please specify note ID or content to delete.`)
  }

  if (toolName === 'delete_all_notes') {
    await db.from('notes').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All notes deleted!`)
  }

  // ── Learning Hub ──
  if (toolName === 'list_courses') {
    const { data } = await db.from('courses').select('*, modules(*, lessons(*))').order('order_index', { ascending: true })
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  if (toolName === 'create_course') {
    const { data, error } = await db.from('courses').insert({
      title: args.title.trim(),
      description: args.description || null,
      category: args.category || 'mindset',
    }).select().single()
    if (error) return mcpError(id, -32603, `Failed to create course: ${error.message}`)
    return mcpOk(id, `🎓 Course "${data.title}" created!`)
  }

  if (toolName === 'create_module') {
    const { data, error } = await db.from('modules').insert({
      course_id: args.course_id,
      title: args.title.trim(),
    }).select().single()
    if (error) return mcpError(id, -32603, `Failed to create module: ${error.message}`)
    return mcpOk(id, `📚 Module "${data.title}" created!`)
  }

  if (toolName === 'create_lesson') {
    const { data, error } = await db.from('lessons').insert({
      module_id: args.module_id,
      title: args.title.trim(),
      content: args.content || null,
      resource_url: args.resource_url || null,
    }).select().single()
    if (error) return mcpError(id, -32603, `Failed to create lesson: ${error.message}`)
    return mcpOk(id, `📖 Lesson "${data.title}" created!`)
  }

  if (toolName === 'mark_lesson_complete') {
    const { targetId } = extractTargetIdAndQuery(args, ['lesson_id'])
    if (!targetId) return mcpError(id, -32602, `Lesson ID required.`)
    await db.from('lesson_progress').upsert({
      user_id: userId,
      lesson_id: targetId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    return mcpOk(id, `🎓 Lesson marked completed!`)
  }

  // ── Full System Reset ──
  if (toolName === 'full_data_reset') {
    await Promise.all([
      db.from('tasks').delete().eq('user_id', userId),
      db.from('todos').delete().eq('user_id', userId),
      db.from('habits').delete().eq('user_id', userId),
      db.from('notes').delete().eq('user_id', userId),
      db.from('journal_entries').delete().eq('user_id', userId),
      db.from('goals').delete().eq('user_id', userId),
      db.from('reminders').delete().eq('user_id', userId),
      db.from('water_logs').delete().eq('user_id', userId),
    ])
    return mcpOk(id, `🚨 FULL SYSTEM RESET COMPLETE! All user data wiped clean.`)
  }

  return mcpError(id, -32601, `Tool "${toolName}" not found.`)
}

// ─── POST & GET Handlers ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await req.json()
    const { id, method, params } = body

    if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
      return new NextResponse(null, { status: 202, headers: CORS_HEADERS })
    }

    if (method === 'ping') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: {} }, { headers: CORS_HEADERS })
    }

    if (method === 'initialize') {
      const clientVersion = params?.protocolVersion || '2024-11-05'
      const serverVersion = ['2025-03-26', '2024-11-05'].includes(clientVersion) ? clientVersion : '2024-11-05'
      return NextResponse.json({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: serverVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'NIRMAAN OS', version: '2.0.0' }
        }
      }, { headers: CORS_HEADERS })
    }

    const userId = await getUserIdFromRequest(req)

    if (method === 'tools/list') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } }, { headers: CORS_HEADERS })
    }

    if (method === 'tools/call') {
      return await handleTool(params?.name, params?.arguments || {}, userId, id)
    }

    return NextResponse.json(
      { jsonrpc: '2.0', id: id || null, error: { code: -32601, message: `Method "${method}" not supported` } },
      { headers: CORS_HEADERS }
    )
  } catch (err: unknown) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32603, message: err instanceof Error ? err.message : 'Internal MCP error' } },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    name: 'NIRMAAN MCP Server',
    tools_count: MCP_TOOLS.length,
    tools: MCP_TOOLS,
    openapi_spec: '/api/mcp/openapi.json',
  }, { headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}
