import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTQ5MywiZXhwIjoyMDk3OTA1NDkzfQ.KaV1NcBeZRWTtYurPyRWqpuUpghk8wJWVK0CtqO4dA0'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

// Valid mood values from DB CHECK constraint
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

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const supabase = getSupabase()
  const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key')
  if (!authHeader) return null

  const rawToken = authHeader.replace('Bearer ', '').trim()
  if (!rawToken) return null

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

  return null
}

// ─── Expanded MCP Tool Definitions ───────────────────────────────────────────

const MCP_TOOLS = [
  // Dashboard
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

  // Tasks & Subtasks
  {
    name: 'list_tasks',
    description: 'List all tasks. Filter by status: todo, in_progress, done. Priority 1=low 2=medium 3=high 4=urgent.',
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
        title: { type: 'string', description: 'Task title (required).' },
        priority: { type: 'number', enum: [1, 2, 3, 4], description: '1=low 2=medium 3=high 4=urgent. Default 3.' },
        due_date: { type: 'string', description: 'ISO date e.g. "2026-09-20".' },
        description: { type: 'string' }
      },
      required: ['title']
    }
  },
  {
    name: 'create_task_with_subtasks',
    description: 'Create a parent task with an array of subtasks in one call.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Parent task title.' },
        priority: { type: 'number', enum: [1, 2, 3, 4] },
        subtasks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of subtask titles.'
        }
      },
      required: ['title', 'subtasks']
    }
  },
  {
    name: 'complete_task',
    description: 'Mark a task as done.',
    inputSchema: {
      type: 'object',
      properties: { task_id: { type: 'string' } },
      required: ['task_id']
    }
  },

  // Todos CRUD & Batch
  {
    name: 'list_todos',
    description: 'List daily checklist todos.',
    inputSchema: {
      type: 'object',
      properties: { is_done: { type: 'boolean' } },
      required: []
    }
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
      properties: {
        titles: { type: 'array', items: { type: 'string' }, description: 'Array of todo titles.' }
      },
      required: ['titles']
    }
  },

  // Health & Reminders
  {
    name: 'log_water_intake',
    description: 'Log water consumption in ml (e.g. 250, 500).',
    inputSchema: {
      type: 'object',
      properties: { amount_ml: { type: 'number', description: 'Water volume in milliliters.' } },
      required: ['amount_ml']
    }
  },
  {
    name: 'create_reminder',
    description: 'Set a reminder alert.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        remind_at: { type: 'string', description: 'ISO date time.' },
        is_recurring: { type: 'boolean' },
        recurrence_rule: { type: 'string', enum: ['daily', 'weekly', 'monthly'] }
      },
      required: ['title']
    }
  },

  // Journal & Goals
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

// ─── Tool Handlers ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTool(toolName: string, args: Record<string, any>, userId: string, id: unknown): Promise<NextResponse> {
  const db = getSupabase()

  // ── get_life_dashboard ──────────────────────────────────────────────────────
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

  // ── get_user_analytics ──────────────────────────────────────────────────────
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

  // ── create_task_with_subtasks ───────────────────────────────────────────────
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

  // ── create_task ────────────────────────────────────────────────────────────
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

  // ── complete_task ──────────────────────────────────────────────────────────
  if (toolName === 'complete_task') {
    const { error } = await db.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', args.task_id)
    if (error) return mcpError(id, -32603, `Failed to complete: ${error.message}`)
    return mcpOk(id, `🎉 Task marked as complete.`)
  }

  // ── list_tasks ─────────────────────────────────────────────────────────────
  if (toolName === 'list_tasks') {
    let query = db.from('tasks').select('id, title, priority, status, due_date').eq('user_id', userId).limit(20)
    if (args.status) query = query.eq('status', args.status)
    const { data } = await query
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  // ── list_todos ─────────────────────────────────────────────────────────────
  if (toolName === 'list_todos') {
    const { data } = await db.from('todos').select('id, title, is_done, due_date').eq('user_id', userId)
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  // ── create_todo ────────────────────────────────────────────────────────────
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

  // ── batch_add_todos ────────────────────────────────────────────────────────
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

  // ── log_water_intake ───────────────────────────────────────────────────────
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

  // ── create_reminder ────────────────────────────────────────────────────────
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

  // ── create_journal_entry ───────────────────────────────────────────────────
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

  // ── create_goal ────────────────────────────────────────────────────────────
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
    if (!userId) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: id || null, error: { code: -32001, message: 'Unauthorized: valid Bearer token required' } },
        { status: 401, headers: { ...CORS_HEADERS, 'WWW-Authenticate': 'Bearer realm="NIRMAAN MCP"' } }
      )
    }

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

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })
  return NextResponse.json({ status: 'online', tools_count: MCP_TOOLS.length, tools: MCP_TOOLS.map(t => t.name) }, { headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}
