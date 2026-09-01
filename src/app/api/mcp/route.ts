import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  // Dashboard & Analytics
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

  // Tasks & Subtasks (Full CRUD)
  {
    name: 'list_tasks',
    description: 'List all tasks. Filter by status: todo, in_progress, done.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
        limit: { type: 'number' }
      },
      required: []
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task. Priority: 1=low, 2=medium, 3=high, 4=urgent (P1).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title.' },
        priority: { type: 'number', enum: [1, 2, 3, 4] },
        due_date: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['title']
    }
  },
  {
    name: 'create_task_with_subtasks',
    description: 'Create a parent task with an array of subtasks.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        priority: { type: 'number', enum: [1, 2, 3, 4] },
        subtasks: { type: 'array', items: { type: 'string' } }
      },
      required: ['title', 'subtasks']
    }
  },
  {
    name: 'complete_task',
    description: 'Mark a task as done by ID.',
    inputSchema: {
      type: 'object',
      properties: { task_id: { type: 'string' } },
      required: ['task_id']
    }
  },
  {
    name: 'delete_task',
    description: 'Delete task(s) matching title or ID.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' } },
      required: ['title']
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
    name: 'delete_todo',
    description: 'Delete todo item(s) matching title or keyword.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' } },
      required: ['title']
    }
  },
  {
    name: 'delete_all_todos',
    description: 'Delete ALL daily checklist todo items.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Health & Water Intake (Full CRUD)
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

  // Reminders (Full CRUD)
  {
    name: 'create_reminder',
    description: 'Set a reminder alert.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        remind_at: { type: 'string' },
        is_recurring: { type: 'boolean' },
        recurrence_rule: { type: 'string', enum: ['daily', 'weekly', 'monthly'] }
      },
      required: ['title']
    }
  },
  {
    name: 'delete_reminder',
    description: 'Delete reminder(s) matching title keyword.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' } },
      required: ['title']
    }
  },
  {
    name: 'delete_all_reminders',
    description: 'Delete ALL reminders for the user.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Journal (Full CRUD)
  {
    name: 'create_journal_entry',
    description: 'Write a journal entry.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        mood: { type: 'string', enum: ['amazing', 'good', 'meh', 'bad', 'awful'] },
        title: { type: 'string' }
      },
      required: ['content']
    }
  },
  {
    name: 'delete_journal_entry',
    description: 'Delete journal entry matching title or content keyword.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' } },
      required: ['title']
    }
  },
  {
    name: 'delete_all_journal_entries',
    description: 'Delete ALL journal entries.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Goals (Full CRUD)
  {
    name: 'create_goal',
    description: 'Create a new life goal.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'number', enum: [1, 2, 3] }
      },
      required: ['title']
    }
  },
  {
    name: 'delete_goal',
    description: 'Delete goal(s) matching title keyword.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' } },
      required: ['title']
    }
  },
  {
    name: 'delete_all_goals',
    description: 'Delete ALL goals.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Habits (Full CRUD)
  {
    name: 'create_habit',
    description: 'Create a new habit.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name']
    }
  },
  {
    name: 'delete_habit',
    description: 'Delete habit(s) matching name keyword.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name']
    }
  },
  {
    name: 'delete_all_habits',
    description: 'Delete ALL habits.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Notes (Full CRUD)
  {
    name: 'create_note',
    description: 'Create a new note.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, content: { type: 'string' } },
      required: ['content']
    }
  },
  {
    name: 'delete_note',
    description: 'Delete note(s) matching title or content keyword.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' } },
      required: ['title']
    }
  },
  {
    name: 'delete_all_notes',
    description: 'Delete ALL notes.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Full System Data Reset
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

// ─── Tool Execution Handlers ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTool(toolName: string, args: Record<string, any>, userId: string, id: unknown): Promise<NextResponse> {
  const db = getSupabase()

  // ── Dashboard & Telemetry ──
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
    const doneTasks = allTasks.filter(t => t.status === 'done').length
    const allTodos = todosRes.data || []
    const doneTodos = allTodos.filter(t => t.is_done).length

    return mcpOk(id, JSON.stringify({
      total_tasks: allTasks.length,
      tasks_completed: doneTasks,
      total_todos: allTodos.length,
      todos_completed: doneTodos,
      total_journal_entries: (journalRes.data || []).length,
    }, null, 2))
  }

  // ── Tasks ──
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

  if (toolName === 'create_task') {
    const { data, error } = await db.from('tasks').insert({
      user_id: userId,
      title: args.title.trim(),
      priority: args.priority || 3,
      due_date: args.due_date || null,
      description: args.description || null,
      status: 'todo',
    }).select('id, title, priority, status').single()
    if (error) return mcpError(id, -32603, `Failed to create task: ${error.message}`)
    return mcpOk(id, `✅ Task created: "${data.title}"`)
  }

  if (toolName === 'complete_task') {
    const { error } = await db.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', args.task_id)
    if (error) return mcpError(id, -32603, `Failed to complete: ${error.message}`)
    return mcpOk(id, `🎉 Task marked as complete.`)
  }

  if (toolName === 'list_tasks') {
    let query = db.from('tasks').select('id, title, priority, status, due_date').eq('user_id', userId).limit(20)
    if (args.status) query = query.eq('status', args.status)
    const { data } = await query
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  if (toolName === 'delete_task') {
    const searchTitle = args.title as string
    const { data: found } = await db.from('tasks').select('id, title').eq('user_id', userId).ilike('title', `%${searchTitle}%`)
    if (!found || found.length === 0) return mcpError(id, -32602, `No task found matching "${searchTitle}"`)
    const ids = found.map(t => t.id)
    await db.from('tasks').delete().in('id', ids)
    return mcpOk(id, `🗑️ Deleted ${found.length} task(s) matching "${searchTitle}"`)
  }

  if (toolName === 'delete_all_tasks') {
    await db.from('tasks').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All tasks deleted successfully!`)
  }

  // ── Todos ──
  if (toolName === 'list_todos') {
    const { data } = await db.from('todos').select('id, title, is_done, due_date').eq('user_id', userId)
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
    return mcpOk(id, `☑️ Todo created: "${data.title}"`)
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

  if (toolName === 'delete_todo') {
    const searchTitle = args.title as string
    const { data: found } = await db.from('todos').select('id, title').eq('user_id', userId).ilike('title', `%${searchTitle}%`)
    if (!found || found.length === 0) return mcpError(id, -32602, `No todo found matching "${searchTitle}"`)
    const ids = found.map(t => t.id)
    await db.from('todos').delete().in('id', ids)
    return mcpOk(id, `🗑️ Deleted ${found.length} todo item(s) matching "${searchTitle}"`)
  }

  if (toolName === 'delete_all_todos') {
    await db.from('todos').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All daily checklist todo items deleted!`)
  }

  // ── Health & Water Intake ──
  if (toolName === 'log_water_intake') {
    const today = new Date().toISOString().split('T')[0]
    const { error } = await db.from('water_logs').insert({
      user_id: userId,
      amount_ml: args.amount_ml,
      date: today,
    })
    if (error) return mcpError(id, -32603, `Failed to log water: ${error.message}`)
    return mcpOk(id, `💧 Logged +${args.amount_ml}ml water!`)
  }

  if (toolName === 'reset_today_water_logs') {
    const today = new Date().toISOString().split('T')[0]
    await db.from('water_logs').delete().eq('user_id', userId).eq('date', today)
    return mcpOk(id, `💧 Today's water intake logs reset to 0ml!`)
  }

  // ── Reminders ──
  if (toolName === 'create_reminder') {
    const { error } = await db.from('reminders').insert({
      user_id: userId,
      title: args.title.trim(),
      remind_at: args.remind_at || new Date(Date.now() + 3600000).toISOString(),
      is_recurring: args.is_recurring || false,
      recurrence_rule: args.recurrence_rule || null,
      is_sent: false,
    })
    if (error) return mcpError(id, -32603, `Failed to create reminder: ${error.message}`)
    return mcpOk(id, `🔔 Reminder scheduled: "${args.title}"`)
  }

  if (toolName === 'delete_reminder') {
    const searchTitle = args.title as string
    const { data: found } = await db.from('reminders').select('id, title').eq('user_id', userId).ilike('title', `%${searchTitle}%`)
    if (!found || found.length === 0) return mcpError(id, -32602, `No reminder found matching "${searchTitle}"`)
    const ids = found.map(r => r.id)
    await db.from('reminders').delete().in('id', ids)
    return mcpOk(id, `🗑️ Deleted ${found.length} reminder(s)`)
  }

  if (toolName === 'delete_all_reminders') {
    await db.from('reminders').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All reminders deleted!`)
  }

  // ── Journal ──
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
    const searchTitle = args.title as string
    const { data: found } = await db.from('journal_entries').select('id, title, content').eq('user_id', userId).or(`title.ilike.%${searchTitle}%,content.ilike.%${searchTitle}%`)
    if (!found || found.length === 0) return mcpError(id, -32602, `No journal entry matching "${searchTitle}"`)
    const ids = found.map(e => e.id)
    await db.from('journal_entries').delete().in('id', ids)
    return mcpOk(id, `🗑️ Deleted ${found.length} journal entry(s)`)
  }

  if (toolName === 'delete_all_journal_entries') {
    await db.from('journal_entries').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All journal entries deleted!`)
  }

  // ── Goals ──
  if (toolName === 'create_goal') {
    const { data, error } = await db.from('goals').insert({
      user_id: userId,
      title: args.title.trim(),
      description: args.description || null,
      status: 'active',
      priority: args.priority || 2,
    }).select('id, title').single()
    if (error) return mcpError(id, -32603, `Failed to create goal: ${error.message}`)
    return mcpOk(id, `🎯 Goal created: "${data.title}"`)
  }

  if (toolName === 'delete_goal') {
    const searchTitle = args.title as string
    const { data: found } = await db.from('goals').select('id, title').eq('user_id', userId).ilike('title', `%${searchTitle}%`)
    if (!found || found.length === 0) return mcpError(id, -32602, `No goal matching "${searchTitle}"`)
    const ids = found.map(g => g.id)
    await db.from('goals').delete().in('id', ids)
    return mcpOk(id, `🗑️ Deleted ${found.length} goal(s)`)
  }

  if (toolName === 'delete_all_goals') {
    await db.from('goals').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All goals deleted!`)
  }

  // ── Habits ──
  if (toolName === 'create_habit') {
    const { data, error } = await db.from('habits').insert({
      user_id: userId,
      name: args.name.trim(),
      frequency: 'daily',
      target_count: 1,
      archived: false,
    }).select('id, name').single()
    if (error) return mcpError(id, -32603, `Failed to create habit: ${error.message}`)
    return mcpOk(id, `🔥 Habit created: "${data.name}"`)
  }

  if (toolName === 'delete_habit') {
    const searchName = args.name as string
    const { data: found } = await db.from('habits').select('id, name').eq('user_id', userId).ilike('name', `%${searchName}%`)
    if (!found || found.length === 0) return mcpError(id, -32602, `No habit matching "${searchName}"`)
    const ids = found.map(h => h.id)
    await db.from('habits').delete().in('id', ids)
    return mcpOk(id, `🗑️ Deleted ${found.length} habit(s)`)
  }

  if (toolName === 'delete_all_habits') {
    await db.from('habits').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All habits deleted!`)
  }

  // ── Notes ──
  if (toolName === 'create_note') {
    const { data: note, error } = await db.from('notes').insert({
      user_id: userId,
      title: args.title?.trim() || null,
      content: args.content.trim(),
    }).select('id, title').single()
    if (error) return mcpError(id, -32603, `Failed to create note: ${error.message}`)
    return mcpOk(id, `📝 Note saved: "${note.title || 'Untitled note'}"`)
  }

  if (toolName === 'delete_note') {
    const searchTitle = args.title as string
    const { data: found } = await db.from('notes').select('id, title, content').eq('user_id', userId).or(`title.ilike.%${searchTitle}%,content.ilike.%${searchTitle}%`)
    if (!found || found.length === 0) return mcpError(id, -32602, `No note matching "${searchTitle}"`)
    const ids = found.map(n => n.id)
    await db.from('notes').delete().in('id', ids)
    return mcpOk(id, `🗑️ Deleted ${found.length} note(s)`)
  }

  if (toolName === 'delete_all_notes') {
    await db.from('notes').delete().eq('user_id', userId)
    return mcpOk(id, `🗑️ All notes deleted!`)
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
