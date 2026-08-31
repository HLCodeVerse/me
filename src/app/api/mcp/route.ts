import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTQ5MywiZXhwIjoyMDk3OTA1NDkzfQ.KaV1NcBeZRWTtYurPyRWqpuUpghk8wJWVK0CtqO4dA0'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

// Valid mood values from DB CHECK constraint
const VALID_MOODS = ['amazing', 'good', 'meh', 'bad', 'awful'] as const
type Mood = typeof VALID_MOODS[number]

// Map emoji / free-text mood → valid DB enum
function normalizeMood(raw: string | undefined | null): Mood {
  if (!raw) return 'good'
  const lower = raw.toLowerCase().trim()
  // Direct match
  if (VALID_MOODS.includes(lower as Mood)) return lower as Mood
  // Emoji / keyword mapping
  const map: Record<string, Mood> = {
    '🚀': 'amazing', '🔥': 'amazing', '⚡': 'amazing', '😄': 'amazing', '🎉': 'amazing', 'great': 'amazing', 'excellent': 'amazing', 'fantastic': 'amazing',
    '😊': 'good', '🙂': 'good', '👍': 'good', 'ok': 'good', 'fine': 'good', 'decent': 'good', 'alright': 'good',
    '😐': 'meh', '🤷': 'meh', 'neutral': 'meh', 'okay': 'meh', 'so-so': 'meh',
    '😞': 'bad', '😔': 'bad', '😤': 'bad', 'sad': 'bad', 'tired': 'bad', 'stressed': 'bad', 'down': 'bad',
    '😢': 'awful', '😭': 'awful', 'terrible': 'awful', 'horrible': 'awful', 'depressed': 'awful',
    '🧘': 'good', '💪': 'good', '😴': 'meh',
  }
  return map[lower] ?? map[raw] ?? 'good'
}

// Valid goal statuses from DB CHECK constraint
const VALID_GOAL_STATUSES = ['active', 'on_hold', 'completed', 'archived'] as const
type GoalStatus = typeof VALID_GOAL_STATUSES[number]
function normalizeGoalStatus(s: string | undefined): GoalStatus {
  if (!s) return 'active'
  if (s === 'paused') return 'on_hold'
  return VALID_GOAL_STATUSES.includes(s as GoalStatus) ? (s as GoalStatus) : 'active'
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

  // 1. OAuth tokens (ChatGPT / Claude)
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

  // 2. API keys (hashed)
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

// ─── MCP Tool Definitions (schema-accurate) ───────────────────────────────────

const MCP_TOOLS = [
  // Dashboard
  {
    name: 'get_life_dashboard',
    description: 'Get a full overview: life score, streak, active tasks, pending todos, and active goals. Call this first to understand the user\'s state.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_streaks',
    description: 'Get the user\'s streak data: current streak, longest streak, and streak history by type (tasks, journal, lessons, overall).',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Tasks CRUD
  {
    name: 'list_tasks',
    description: 'List all tasks. Filter by status: todo, in_progress, or done. Returns id, title, priority (1=low 2=medium 3=high 4=urgent), status, due_date.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in_progress', 'done'], description: 'Filter by status. Omit to list all.' },
        limit: { type: 'number', description: 'Max results (default 20).' }
      },
      required: []
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task. Priority: 1=low, 2=medium, 3=high (default), 4=urgent.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title (required).' },
        priority: { type: 'number', enum: [1, 2, 3, 4], description: '1=low 2=medium 3=high 4=urgent. Default 3.' },
        due_date: { type: 'string', description: 'ISO date e.g. "2026-09-20". Optional.' },
        description: { type: 'string', description: 'Additional details. Optional.' }
      },
      required: ['title']
    }
  },
  {
    name: 'update_task',
    description: 'Update a task. Provide task_id plus any fields to change.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID (required).' },
        title: { type: 'string' },
        priority: { type: 'number', enum: [1, 2, 3, 4] },
        status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
        due_date: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'complete_task',
    description: 'Mark a task as done. Use when user says they finished something.',
    inputSchema: {
      type: 'object',
      properties: { task_id: { type: 'string', description: 'Task ID (required).' } },
      required: ['task_id']
    }
  },
  {
    name: 'delete_task',
    description: 'Permanently delete a task by ID.',
    inputSchema: {
      type: 'object',
      properties: { task_id: { type: 'string', description: 'Task ID (required).' } },
      required: ['task_id']
    }
  },

  // Todos CRUD — column is is_done (not completed)
  {
    name: 'list_todos',
    description: 'List daily todos. Filter by done status. Returns id, title, is_done, due_date.',
    inputSchema: {
      type: 'object',
      properties: {
        is_done: { type: 'boolean', description: 'Filter by completion. Omit for all.' }
      },
      required: []
    }
  },
  {
    name: 'create_todo',
    description: 'Add a new daily todo item to the checklist.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Todo text (required).' },
        due_date: { type: 'string', description: 'Optional due date e.g. "2026-09-01".' }
      },
      required: ['title']
    }
  },
  {
    name: 'toggle_todo',
    description: 'Mark a todo as done or undo it. Toggles the current state.',
    inputSchema: {
      type: 'object',
      properties: { todo_id: { type: 'string', description: 'Todo ID (required).' } },
      required: ['todo_id']
    }
  },
  {
    name: 'delete_todo',
    description: 'Delete a todo item by ID.',
    inputSchema: {
      type: 'object',
      properties: { todo_id: { type: 'string', description: 'Todo ID (required).' } },
      required: ['todo_id']
    }
  },

  // Journal CRUD — mood must be: amazing, good, meh, bad, awful
  {
    name: 'list_journal_entries',
    description: 'List recent journal/reflection entries. Returns content, mood (amazing/good/meh/bad/awful), and timestamp.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max entries (default 10).' } },
      required: []
    }
  },
  {
    name: 'create_journal_entry',
    description: 'Write a journal entry. Mood must be one of: amazing, good, meh, bad, awful. Emojis are auto-converted.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Journal text (required).' },
        mood: {
          type: 'string',
          enum: ['amazing', 'good', 'meh', 'bad', 'awful'],
          description: 'Mood level. Default: good.'
        },
        title: { type: 'string', description: 'Optional title.' }
      },
      required: ['content']
    }
  },
  {
    name: 'delete_journal_entry',
    description: 'Delete a journal entry by ID.',
    inputSchema: {
      type: 'object',
      properties: { entry_id: { type: 'string', description: 'Journal entry ID (required).' } },
      required: ['entry_id']
    }
  },

  // Goals CRUD — status: active, on_hold, completed, archived
  {
    name: 'list_goals',
    description: 'List goals. Filter by status: active, on_hold, completed, archived.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'on_hold', 'completed', 'archived'], description: 'Filter by status. Omit for all.' }
      },
      required: []
    }
  },
  {
    name: 'create_goal',
    description: 'Create a new goal. Priority: 1=low, 2=medium (default), 3=high.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Goal title (required).' },
        description: { type: 'string', description: 'Detailed description. Optional.' },
        target_date: { type: 'string', description: 'Target date as ISO string. Optional.' },
        priority: { type: 'number', enum: [1, 2, 3], description: '1=low 2=medium 3=high. Default 2.' }
      },
      required: ['title']
    }
  },
  {
    name: 'update_goal',
    description: 'Update a goal. Status: active, on_hold, completed, archived.',
    inputSchema: {
      type: 'object',
      properties: {
        goal_id: { type: 'string', description: 'Goal ID (required).' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['active', 'on_hold', 'completed', 'archived'] },
        priority: { type: 'number', enum: [1, 2, 3] }
      },
      required: ['goal_id']
    }
  },
  {
    name: 'delete_goal',
    description: 'Delete a goal by ID.',
    inputSchema: {
      type: 'object',
      properties: { goal_id: { type: 'string', description: 'Goal ID (required).' } },
      required: ['goal_id']
    }
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    const [profileRes, tasksRes, todosRes, goalsRes, streaksRes] = await Promise.all([
      db.from('profiles').select('display_name, username, life_score, current_streak, longest_streak').eq('id', userId).maybeSingle(),
      db.from('tasks').select('id, title, priority, status, due_date').eq('user_id', userId).neq('status', 'done').order('priority', { ascending: false }).limit(5),
      db.from('todos').select('id, title, is_done').eq('user_id', userId).eq('is_done', false).order('created_at', { ascending: false }).limit(5),
      (async () => { try { return await db.from('goals').select('id, title, status, priority').eq('user_id', userId).eq('status', 'active').limit(5) } catch { return { data: [] } } })(),
      (async () => { try { return await db.from('streaks').select('type, current_count, longest_count').eq('user_id', userId) } catch { return { data: [] } } })(),
    ])

    const p = profileRes.data as Record<string, unknown> | null
    return mcpOk(id, JSON.stringify({
      user: {
        name: p?.display_name || p?.username || 'Builder',
        life_score: p?.life_score ?? 0,
        current_streak: p?.current_streak ?? 0,
        longest_streak: p?.longest_streak ?? 0,
      },
      active_tasks: tasksRes.data || [],
      pending_todos: todosRes.data || [],
      active_goals: (goalsRes as { data: unknown[] }).data || [],
      streaks: (streaksRes as { data: unknown[] }).data || [],
    }, null, 2))
  }

  // ── get_streaks ─────────────────────────────────────────────────────────────
  if (toolName === 'get_streaks') {
    const { data: profile } = await db.from('profiles')
      .select('display_name, life_score, current_streak, longest_streak')
      .eq('id', userId).maybeSingle()
    const { data: streaks } = await db.from('streaks')
      .select('type, current_count, longest_count, last_active_date')
      .eq('user_id', userId)
    return mcpOk(id, JSON.stringify({ profile: profile || {}, streaks: streaks || [] }, null, 2))
  }

  // ── list_tasks ─────────────────────────────────────────────────────────────
  if (toolName === 'list_tasks') {
    let query = db.from('tasks').select('id, title, priority, status, due_date, description, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(Math.min(args.limit || 20, 100))
    if (args.status) query = query.eq('status', args.status)
    const { data, error } = await query
    if (error) return mcpError(id, -32603, `Failed to list tasks: ${error.message}`)
    const count = (data || []).length
    return mcpOk(id, `Found ${count} task${count !== 1 ? 's' : ''}:\n\n${JSON.stringify(data || [], null, 2)}`)
  }

  // ── create_task ────────────────────────────────────────────────────────────
  if (toolName === 'create_task') {
    if (!args.title?.trim()) return mcpError(id, -32602, 'title is required')
    const { data, error } = await db.from('tasks').insert({
      user_id: userId,
      title: args.title.trim(),
      priority: args.priority || 3,
      due_date: args.due_date || null,
      description: args.description || null,
      status: 'todo',
    }).select('id, title, priority, status, due_date').single()
    if (error) return mcpError(id, -32603, `Failed to create task: ${error.message}`)
    const priorityLabel = ['', 'Low', 'Medium', 'High', 'Urgent'][data.priority] || 'High'
    return mcpOk(id, `✅ Task created!\n\n📌 ${data.title}\nID: ${data.id}\nPriority: ${priorityLabel}\nStatus: ${data.status}${data.due_date ? `\nDue: ${data.due_date}` : ''}`)
  }

  // ── update_task ────────────────────────────────────────────────────────────
  if (toolName === 'update_task') {
    if (!args.task_id) return mcpError(id, -32602, 'task_id is required')
    const { data: existing } = await db.from('tasks').select('id, title').eq('id', args.task_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Task not found: ${args.task_id}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {}
    if (args.title !== undefined) updates.title = args.title.trim()
    if (args.priority !== undefined) updates.priority = args.priority
    if (args.status !== undefined) updates.status = args.status
    if (args.due_date !== undefined) updates.due_date = args.due_date
    if (args.description !== undefined) updates.description = args.description
    const { data, error } = await db.from('tasks').update(updates).eq('id', args.task_id).select('id, title, priority, status').single()
    if (error) return mcpError(id, -32603, `Failed to update: ${error.message}`)
    return mcpOk(id, `✅ Task updated!\n\n📌 ${data.title}\nStatus: ${data.status}\nPriority: ${['', 'Low', 'Medium', 'High', 'Urgent'][data.priority]}`)
  }

  // ── complete_task ──────────────────────────────────────────────────────────
  if (toolName === 'complete_task') {
    if (!args.task_id) return mcpError(id, -32602, 'task_id is required')
    const { data: existing } = await db.from('tasks').select('id, title').eq('id', args.task_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Task not found: ${args.task_id}`)
    const { error } = await db.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', args.task_id)
    if (error) return mcpError(id, -32603, `Failed to complete: ${error.message}`)
    return mcpOk(id, `🎉 Task completed! "${existing.title}" is done.`)
  }

  // ── delete_task ────────────────────────────────────────────────────────────
  if (toolName === 'delete_task') {
    if (!args.task_id) return mcpError(id, -32602, 'task_id is required')
    const { data: existing } = await db.from('tasks').select('id, title').eq('id', args.task_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Task not found: ${args.task_id}`)
    const { error } = await db.from('tasks').delete().eq('id', args.task_id)
    if (error) return mcpError(id, -32603, `Failed to delete: ${error.message}`)
    return mcpOk(id, `🗑️ Deleted task: "${existing.title}"`)
  }

  // ── list_todos ─────────────────────────────────────────────────────────────
  // FIX: column is `is_done` not `completed`
  if (toolName === 'list_todos') {
    let query = db.from('todos').select('id, title, is_done, due_date, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false })
    if (args.is_done !== undefined) query = query.eq('is_done', args.is_done)
    const { data, error } = await query
    if (error) return mcpError(id, -32603, `Failed to list todos: ${error.message}`)
    const count = (data || []).length
    return mcpOk(id, `Found ${count} todo${count !== 1 ? 's' : ''}:\n\n${JSON.stringify(data || [], null, 2)}`)
  }

  // ── create_todo ────────────────────────────────────────────────────────────
  // FIX: use `is_done` not `completed`
  if (toolName === 'create_todo') {
    if (!args.title?.trim()) return mcpError(id, -32602, 'title is required')
    const { data, error } = await db.from('todos').insert({
      user_id: userId,
      title: args.title.trim(),
      is_done: false,
      due_date: args.due_date || null,
    }).select('id, title, is_done').single()
    if (error) return mcpError(id, -32603, `Failed to create todo: ${error.message}`)
    return mcpOk(id, `☑️ Todo added: "${data.title}" (ID: ${data.id})`)
  }

  // ── toggle_todo ────────────────────────────────────────────────────────────
  // FIX: use `is_done` not `completed`
  if (toolName === 'toggle_todo') {
    if (!args.todo_id) return mcpError(id, -32602, 'todo_id is required')
    const { data: existing } = await db.from('todos').select('id, title, is_done').eq('id', args.todo_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Todo not found: ${args.todo_id}`)
    const newState = !existing.is_done
    const { error } = await db.from('todos').update({ is_done: newState }).eq('id', args.todo_id)
    if (error) return mcpError(id, -32603, `Failed to toggle: ${error.message}`)
    return mcpOk(id, `${newState ? '✅' : '🔄'} "${existing.title}" marked as ${newState ? 'done' : 'not done'}.`)
  }

  // ── delete_todo ────────────────────────────────────────────────────────────
  if (toolName === 'delete_todo') {
    if (!args.todo_id) return mcpError(id, -32602, 'todo_id is required')
    const { data: existing } = await db.from('todos').select('id, title').eq('id', args.todo_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Todo not found: ${args.todo_id}`)
    const { error } = await db.from('todos').delete().eq('id', args.todo_id)
    if (error) return mcpError(id, -32603, `Failed to delete: ${error.message}`)
    return mcpOk(id, `🗑️ Deleted todo: "${existing.title}"`)
  }

  // ── list_journal_entries ───────────────────────────────────────────────────
  if (toolName === 'list_journal_entries') {
    const { data, error } = await db.from('journal_entries')
      .select('id, title, content, mood, mood_score, entry_type, tags, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.min(args.limit || 10, 50))
    if (error) return mcpError(id, -32603, `Failed to list journal entries: ${error.message}`)
    const count = (data || []).length
    return mcpOk(id, `Found ${count} journal entr${count !== 1 ? 'ies' : 'y'}:\n\n${JSON.stringify(data || [], null, 2)}`)
  }

  // ── create_journal_entry ───────────────────────────────────────────────────
  // FIX: mood must be one of amazing/good/meh/bad/awful — auto-normalize emojis
  if (toolName === 'create_journal_entry') {
    if (!args.content?.trim()) return mcpError(id, -32602, 'content is required')
    const mood = normalizeMood(args.mood)
    const { data, error } = await db.from('journal_entries').insert({
      user_id: userId,
      title: args.title?.trim() || null,
      content: args.content.trim(),
      mood,
      entry_type: 'free',
      tags: [],
    }).select('id, content, mood, created_at').single()
    if (error) return mcpError(id, -32603, `Failed to create journal entry: ${error.message}`)
    const moodEmoji: Record<string, string> = { amazing: '🚀', good: '😊', meh: '😐', bad: '😞', awful: '😢' }
    return mcpOk(id, `${moodEmoji[data.mood] || '📝'} Journal entry saved! (Mood: ${data.mood})\n\n"${data.content}"\n\nID: ${data.id}`)
  }

  // ── delete_journal_entry ───────────────────────────────────────────────────
  if (toolName === 'delete_journal_entry') {
    if (!args.entry_id) return mcpError(id, -32602, 'entry_id is required')
    const { data: existing } = await db.from('journal_entries').select('id, content').eq('id', args.entry_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Journal entry not found: ${args.entry_id}`)
    const { error } = await db.from('journal_entries').delete().eq('id', args.entry_id)
    if (error) return mcpError(id, -32603, `Failed to delete: ${error.message}`)
    return mcpOk(id, `🗑️ Journal entry deleted.`)
  }

  // ── list_goals ─────────────────────────────────────────────────────────────
  // FIX: statuses are active/on_hold/completed/archived (not paused)
  if (toolName === 'list_goals') {
    let query = db.from('goals').select('id, title, description, status, priority, target_date')
      .eq('user_id', userId).order('priority', { ascending: false })
    if (args.status) query = query.eq('status', normalizeGoalStatus(args.status))
    const { data, error } = await query
    if (error) return mcpError(id, -32603, `Failed to list goals: ${error.message}`)
    const count = (data || []).length
    return mcpOk(id, `Found ${count} goal${count !== 1 ? 's' : ''}:\n\n${JSON.stringify(data || [], null, 2)}`)
  }

  // ── create_goal ────────────────────────────────────────────────────────────
  if (toolName === 'create_goal') {
    if (!args.title?.trim()) return mcpError(id, -32602, 'title is required')
    const { data, error } = await db.from('goals').insert({
      user_id: userId,
      title: args.title.trim(),
      description: args.description || null,
      target_date: args.target_date || null,
      status: 'active',
      priority: args.priority || 2,
    }).select('id, title, status, priority').single()
    if (error) return mcpError(id, -32603, `Failed to create goal: ${error.message}`)
    return mcpOk(id, `🎯 Goal created!\n\n${data.title}\nID: ${data.id}\nStatus: ${data.status}`)
  }

  // ── update_goal ────────────────────────────────────────────────────────────
  if (toolName === 'update_goal') {
    if (!args.goal_id) return mcpError(id, -32602, 'goal_id is required')
    const { data: existing } = await db.from('goals').select('id, title').eq('id', args.goal_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Goal not found: ${args.goal_id}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {}
    if (args.title !== undefined) updates.title = args.title.trim()
    if (args.description !== undefined) updates.description = args.description
    if (args.status !== undefined) updates.status = normalizeGoalStatus(args.status)
    if (args.priority !== undefined) updates.priority = args.priority
    const { data, error } = await db.from('goals').update(updates).eq('id', args.goal_id).select('id, title, status, priority').single()
    if (error) return mcpError(id, -32603, `Failed to update: ${error.message}`)
    return mcpOk(id, `✅ Goal updated!\n\n${data.title}\nStatus: ${data.status}`)
  }

  // ── delete_goal ────────────────────────────────────────────────────────────
  if (toolName === 'delete_goal') {
    if (!args.goal_id) return mcpError(id, -32602, 'goal_id is required')
    const { data: existing } = await db.from('goals').select('id, title').eq('id', args.goal_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Goal not found: ${args.goal_id}`)
    const { error } = await db.from('goals').delete().eq('id', args.goal_id)
    if (error) return mcpError(id, -32603, `Failed to delete: ${error.message}`)
    return mcpOk(id, `🗑️ Deleted goal: "${existing.title}"`)
  }

  return mcpError(id, -32601, `Tool "${toolName}" not found. Available: ${MCP_TOOLS.map(t => t.name).join(', ')}`)
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await req.json()
    const { id, method, params } = body

    // No-op notifications (must NOT require auth — MCP spec)
    if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
      return new NextResponse(null, { status: 202, headers: CORS_HEADERS })
    }

    // Ping (no auth required)
    if (method === 'ping') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: {} }, { headers: CORS_HEADERS })
    }

    // Initialize (no auth required — sent before any auth)
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

    // All other methods require auth
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

    // Stubs for optional MCP capabilities
    if (method === 'resources/list') return NextResponse.json({ jsonrpc: '2.0', id, result: { resources: [] } }, { headers: CORS_HEADERS })
    if (method === 'prompts/list') return NextResponse.json({ jsonrpc: '2.0', id, result: { prompts: [] } }, { headers: CORS_HEADERS })

    return NextResponse.json(
      { jsonrpc: '2.0', id: id || null, error: { code: -32601, message: `Method "${method}" not supported` } },
      { headers: CORS_HEADERS }
    )
  } catch (err: unknown) {
    console.error('[MCP] Error:', err)
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32603, message: err instanceof Error ? err.message : 'Internal MCP error' } },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

function getMcpOrigin(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'me-eight-dun.vercel.app'
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  const userId = await getUserIdFromRequest(req)
  const action = req.nextUrl.searchParams.get('action')
  const origin = getMcpOrigin(req)
  const prmUrl = `${origin}/api/mcp/.well-known/oauth-protected-resource`
  const authServerUrl = `${origin}/api/mcp/.well-known/oauth-authorization-server`

  if (!action && !userId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'NIRMAAN MCP — authenticate to use tools', resource_metadata: prmUrl, authorization_server: authServerUrl },
      { status: 401, headers: { ...CORS_HEADERS, 'WWW-Authenticate': `Bearer realm="NIRMAAN MCP", resource_metadata="${prmUrl}"` } }
    )
  }

  if (!action && userId) {
    return NextResponse.json({
      status: 'online', server: 'NIRMAAN OS MCP', version: '2.0.0',
      tools_count: MCP_TOOLS.length, tools: MCP_TOOLS.map(t => t.name),
      endpoints: { mcp_jsonrpc: `${origin}/api/mcp`, openapi: `${origin}/api/mcp/openapi.json`, oauth_metadata: authServerUrl }
    }, { headers: CORS_HEADERS })
  }

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })

  if (action === 'dashboard') {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
    const { data: todos } = await supabase.from('todos').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
    return NextResponse.json({ profile, tasks, todos }, { headers: CORS_HEADERS })
  }

  if (action === 'tasks') {
    const { data } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    return NextResponse.json(data || [], { headers: CORS_HEADERS })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400, headers: CORS_HEADERS })
}

// ─── OPTIONS ──────────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}
