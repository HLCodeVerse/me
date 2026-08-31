import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTQ5MywiZXhwIjoyMDk3OTA1NDkzfQ.KaV1NcBeZRWTtYurPyRWqpuUpghk8wJWVK0CtqO4dA0'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
  // Use service role key so write operations bypass RLS for MCP
  return createClient(url, SERVICE_KEY || ANON_KEY)
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const supabase = getSupabase()
  const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key')
  if (!authHeader) return null

  const rawToken = authHeader.replace('Bearer ', '').trim()
  if (!rawToken) return null

  // 1. Check mcp_oauth_tokens (ChatGPT / Claude MCP connections)
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

  // 2. Check api_keys (direct API integrations — hashed)
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

// ─── MCP Tool Definitions ─────────────────────────────────────────────────────

const MCP_TOOLS = [
  // ── Dashboard ──────────────────────────────────────────────────────────────
  {
    name: 'get_life_dashboard',
    description: 'Get a full overview of the user\'s NIRMAAN OS: life score, current streak, recent tasks, todos, and goals. Use this first to understand the user\'s current state.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // ── Tasks ───────────────────────────────────────────────────────────────────
  {
    name: 'list_tasks',
    description: 'List all tasks for the user. Optionally filter by status. Returns id, title, priority, status, due_date, created_at.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done'],
          description: 'Filter tasks by status. Omit to get all tasks.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return (default 20, max 100).'
        }
      },
      required: []
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task in NIRMAAN OS. Use this when the user wants to add a focus task, project item, or goal-linked action.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title (required).' },
        priority: {
          type: 'number',
          enum: [1, 2, 3, 4],
          description: 'Priority level: 1=low, 2=medium, 3=high, 4=urgent. Default is 3 (high).'
        },
        due_date: { type: 'string', description: 'Due date as ISO 8601 string e.g. "2026-09-15". Optional.' },
        notes: { type: 'string', description: 'Additional notes or description for the task. Optional.' }
      },
      required: ['title']
    }
  },
  {
    name: 'update_task',
    description: 'Update an existing task\'s title, priority, due date, status, or notes. Must provide the task ID.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'The unique ID of the task to update (required).' },
        title: { type: 'string', description: 'New title for the task.' },
        priority: {
          type: 'number',
          enum: [1, 2, 3, 4],
          description: 'New priority: 1=low, 2=medium, 3=high, 4=urgent.'
        },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done'],
          description: 'New status for the task.'
        },
        due_date: { type: 'string', description: 'New due date as ISO 8601 string. Pass null to clear.' },
        notes: { type: 'string', description: 'New notes/description.' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'complete_task',
    description: 'Mark a task as done/completed in NIRMAAN OS. Use when the user says they finished a task.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'The unique ID of the task to mark as complete (required).' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'delete_task',
    description: 'Permanently delete a task from NIRMAAN OS. Use with caution — this cannot be undone.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'The unique ID of the task to delete (required).' }
      },
      required: ['task_id']
    }
  },

  // ── Todos ───────────────────────────────────────────────────────────────────
  {
    name: 'list_todos',
    description: 'List all daily todos for the user. Returns id, title, completed status, created_at.',
    inputSchema: {
      type: 'object',
      properties: {
        completed: {
          type: 'boolean',
          description: 'Filter by completion status. Omit to get all todos.'
        }
      },
      required: []
    }
  },
  {
    name: 'create_todo',
    description: 'Add a new daily todo item to the user\'s NIRMAAN OS checklist.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The todo item text (required).' }
      },
      required: ['title']
    }
  },
  {
    name: 'toggle_todo',
    description: 'Toggle a todo item between completed and not completed. Use when the user checks off or unchecks a todo.',
    inputSchema: {
      type: 'object',
      properties: {
        todo_id: { type: 'string', description: 'The unique ID of the todo to toggle (required).' }
      },
      required: ['todo_id']
    }
  },
  {
    name: 'delete_todo',
    description: 'Permanently delete a todo item from NIRMAAN OS.',
    inputSchema: {
      type: 'object',
      properties: {
        todo_id: { type: 'string', description: 'The unique ID of the todo to delete (required).' }
      },
      required: ['todo_id']
    }
  },

  // ── Journal ─────────────────────────────────────────────────────────────────
  {
    name: 'list_journal_entries',
    description: 'Retrieve recent journal/reflection entries from NIRMAAN OS. Returns content, mood, and timestamp.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of recent entries to return (default 10, max 50).'
        }
      },
      required: []
    }
  },
  {
    name: 'create_journal_entry',
    description: 'Write a micro-journal entry or reflection in NIRMAAN OS. Use for daily wins, reflections, mood check-ins, or any personal note.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The journal reflection text (required).' },
        mood: {
          type: 'string',
          description: 'Mood emoji or keyword e.g. "⚡", "🔥", "🧘", "😤", "🚀". Optional.'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'delete_journal_entry',
    description: 'Delete a journal entry from NIRMAAN OS.',
    inputSchema: {
      type: 'object',
      properties: {
        entry_id: { type: 'string', description: 'The unique ID of the journal entry to delete (required).' }
      },
      required: ['entry_id']
    }
  },

  // ── Goals ───────────────────────────────────────────────────────────────────
  {
    name: 'list_goals',
    description: 'List all goals for the user in NIRMAAN OS with their progress and status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'completed', 'paused'],
          description: 'Filter by goal status. Omit to get all goals.'
        }
      },
      required: []
    }
  },
  {
    name: 'create_goal',
    description: 'Create a new goal or milestone in NIRMAAN OS. Goals are long-term targets the user works toward.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Goal title (required).' },
        description: { type: 'string', description: 'Detailed description of the goal. Optional.' },
        target_date: { type: 'string', description: 'Target completion date as ISO 8601 string. Optional.' },
        category: {
          type: 'string',
          description: 'Goal category e.g. "health", "career", "learning", "finance", "personal". Optional.'
        }
      },
      required: ['title']
    }
  },
  {
    name: 'update_goal',
    description: 'Update an existing goal\'s title, description, progress, or status.',
    inputSchema: {
      type: 'object',
      properties: {
        goal_id: { type: 'string', description: 'The unique ID of the goal to update (required).' },
        title: { type: 'string', description: 'New title for the goal.' },
        description: { type: 'string', description: 'New description.' },
        status: {
          type: 'string',
          enum: ['active', 'completed', 'paused'],
          description: 'New status.'
        },
        progress: {
          type: 'number',
          description: 'Progress percentage 0–100.'
        }
      },
      required: ['goal_id']
    }
  },
  {
    name: 'delete_goal',
    description: 'Delete a goal from NIRMAAN OS.',
    inputSchema: {
      type: 'object',
      properties: {
        goal_id: { type: 'string', description: 'The unique ID of the goal to delete (required).' }
      },
      required: ['goal_id']
    }
  },

  // ── Streaks ─────────────────────────────────────────────────────────────────
  {
    name: 'get_streaks',
    description: 'Get the user\'s current activity streak, life score history, and streak data from NIRMAAN OS.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
]

// ─── MCP JSON-RPC Response Helpers ───────────────────────────────────────────

function mcpOk(id: unknown, text: string) {
  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    result: { content: [{ type: 'text', text }] }
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  })
}

function mcpError(id: unknown, code: number, message: string) {
  return NextResponse.json(
    { jsonrpc: '2.0', id, error: { code, message } },
    { headers: { 'Access-Control-Allow-Origin': '*' } }
  )
}

// ─── Tool Handlers ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTool(toolName: string, args: Record<string, any>, userId: string, id: unknown): Promise<NextResponse> {
  const db = getSupabase()

  // ── get_life_dashboard ──────────────────────────────────────────────────────
  if (toolName === 'get_life_dashboard') {
    const [profileRes, tasksRes, todosRes, goalsRes] = await Promise.all([
      db.from('profiles').select('id, display_name, username, life_score, current_streak, longest_streak').eq('id', userId).maybeSingle(),
      db.from('tasks').select('id, title, priority, status, due_date').eq('user_id', userId).neq('status', 'done').order('priority', { ascending: false }).limit(5),
      db.from('todos').select('id, title, completed').eq('user_id', userId).eq('completed', false).order('created_at', { ascending: false }).limit(5),
      // goals table may not exist yet — fall back gracefully
      (async () => {
        try {
          return await db.from('goals').select('id, title, status, progress').eq('user_id', userId).eq('status', 'active').limit(5)
        } catch { return { data: [] } }
      })(),
    ])

    const profile = profileRes.data || { display_name: 'Builder', life_score: 85, current_streak: 0, longest_streak: 0 }
    const summary = {
      user: {
        name: (profile as Record<string, unknown>).display_name || 'Builder',
        life_score: (profile as Record<string, unknown>).life_score || 0,
        current_streak: (profile as Record<string, unknown>).current_streak || 0,
        longest_streak: (profile as Record<string, unknown>).longest_streak || 0,
      },
      active_tasks: tasksRes.data || [],
      pending_todos: todosRes.data || [],
      active_goals: (goalsRes as { data: unknown[] }).data || [],
    }
    return mcpOk(id, JSON.stringify(summary, null, 2))
  }

  // ── list_tasks ─────────────────────────────────────────────────────────────
  if (toolName === 'list_tasks') {
    let query = db.from('tasks').select('id, title, priority, status, due_date, notes, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(Math.min(args.limit || 20, 100))
    if (args.status) query = query.eq('status', args.status)
    const { data, error } = await query
    if (error) return mcpError(id, -32603, `Failed to list tasks: ${error.message}`)
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  // ── create_task ────────────────────────────────────────────────────────────
  if (toolName === 'create_task') {
    if (!args.title?.trim()) return mcpError(id, -32602, 'title is required')
    const { data, error } = await db.from('tasks').insert({
      user_id: userId,
      title: args.title.trim(),
      priority: args.priority || 3,
      due_date: args.due_date || null,
      notes: args.notes || null,
      status: 'todo',
    }).select('id, title, priority, status, due_date').single()
    if (error) return mcpError(id, -32603, `Failed to create task: ${error.message}`)
    return mcpOk(id, `✅ Task created successfully!\n\nID: ${data.id}\nTitle: ${data.title}\nPriority: ${['', 'Low', 'Medium', 'High', 'Urgent'][data.priority]}\nStatus: ${data.status}${data.due_date ? `\nDue: ${data.due_date}` : ''}`)
  }

  // ── update_task ────────────────────────────────────────────────────────────
  if (toolName === 'update_task') {
    if (!args.task_id) return mcpError(id, -32602, 'task_id is required')
    // Verify ownership
    const { data: existing } = await db.from('tasks').select('id, title').eq('id', args.task_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Task ${args.task_id} not found`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {}
    if (args.title !== undefined) updates.title = args.title.trim()
    if (args.priority !== undefined) updates.priority = args.priority
    if (args.status !== undefined) updates.status = args.status
    if (args.due_date !== undefined) updates.due_date = args.due_date
    if (args.notes !== undefined) updates.notes = args.notes
    const { data, error } = await db.from('tasks').update(updates).eq('id', args.task_id).select('id, title, priority, status, due_date').single()
    if (error) return mcpError(id, -32603, `Failed to update task: ${error.message}`)
    return mcpOk(id, `✅ Task updated!\n\nID: ${data.id}\nTitle: ${data.title}\nStatus: ${data.status}\nPriority: ${['', 'Low', 'Medium', 'High', 'Urgent'][data.priority]}`)
  }

  // ── complete_task ──────────────────────────────────────────────────────────
  if (toolName === 'complete_task') {
    if (!args.task_id) return mcpError(id, -32602, 'task_id is required')
    const { data: existing } = await db.from('tasks').select('id, title').eq('id', args.task_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Task ${args.task_id} not found`)
    const { error } = await db.from('tasks').update({ status: 'done' }).eq('id', args.task_id)
    if (error) return mcpError(id, -32603, `Failed to complete task: ${error.message}`)
    return mcpOk(id, `🎉 Task completed! "${existing.title}" marked as done.`)
  }

  // ── delete_task ────────────────────────────────────────────────────────────
  if (toolName === 'delete_task') {
    if (!args.task_id) return mcpError(id, -32602, 'task_id is required')
    const { data: existing } = await db.from('tasks').select('id, title').eq('id', args.task_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Task ${args.task_id} not found`)
    const { error } = await db.from('tasks').delete().eq('id', args.task_id)
    if (error) return mcpError(id, -32603, `Failed to delete task: ${error.message}`)
    return mcpOk(id, `🗑️ Task "${existing.title}" deleted.`)
  }

  // ── list_todos ─────────────────────────────────────────────────────────────
  if (toolName === 'list_todos') {
    let query = db.from('todos').select('id, title, completed, created_at').eq('user_id', userId).order('created_at', { ascending: false })
    if (args.completed !== undefined) query = query.eq('completed', args.completed)
    const { data, error } = await query
    if (error) return mcpError(id, -32603, `Failed to list todos: ${error.message}`)
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  // ── create_todo ────────────────────────────────────────────────────────────
  if (toolName === 'create_todo') {
    if (!args.title?.trim()) return mcpError(id, -32602, 'title is required')
    const { data, error } = await db.from('todos').insert({
      user_id: userId,
      title: args.title.trim(),
      completed: false,
    }).select('id, title, completed').single()
    if (error) return mcpError(id, -32603, `Failed to create todo: ${error.message}`)
    return mcpOk(id, `✅ Todo added: "${data.title}" (ID: ${data.id})`)
  }

  // ── toggle_todo ────────────────────────────────────────────────────────────
  if (toolName === 'toggle_todo') {
    if (!args.todo_id) return mcpError(id, -32602, 'todo_id is required')
    const { data: existing } = await db.from('todos').select('id, title, completed').eq('id', args.todo_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Todo ${args.todo_id} not found`)
    const newState = !existing.completed
    const { error } = await db.from('todos').update({ completed: newState }).eq('id', args.todo_id)
    if (error) return mcpError(id, -32603, `Failed to toggle todo: ${error.message}`)
    return mcpOk(id, `${newState ? '✅' : '🔄'} Todo "${existing.title}" marked as ${newState ? 'completed' : 'incomplete'}.`)
  }

  // ── delete_todo ────────────────────────────────────────────────────────────
  if (toolName === 'delete_todo') {
    if (!args.todo_id) return mcpError(id, -32602, 'todo_id is required')
    const { data: existing } = await db.from('todos').select('id, title').eq('id', args.todo_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Todo ${args.todo_id} not found`)
    const { error } = await db.from('todos').delete().eq('id', args.todo_id)
    if (error) return mcpError(id, -32603, `Failed to delete todo: ${error.message}`)
    return mcpOk(id, `🗑️ Todo "${existing.title}" deleted.`)
  }

  // ── list_journal_entries ───────────────────────────────────────────────────
  if (toolName === 'list_journal_entries') {
    const { data, error } = await db.from('journal_entries')
      .select('id, content, mood, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.min(args.limit || 10, 50))
    if (error) return mcpError(id, -32603, `Failed to list journal entries: ${error.message}`)
    return mcpOk(id, JSON.stringify(data || [], null, 2))
  }

  // ── create_journal_entry ───────────────────────────────────────────────────
  if (toolName === 'create_journal_entry') {
    if (!args.content?.trim()) return mcpError(id, -32602, 'content is required')
    const { data, error } = await db.from('journal_entries').insert({
      user_id: userId,
      content: args.content.trim(),
      mood: args.mood || '⚡',
    }).select('id, content, mood, created_at').single()
    if (error) return mcpError(id, -32603, `Failed to create journal entry: ${error.message}`)
    return mcpOk(id, `${data.mood} Journal entry saved!\n\n"${data.content}"\n\nID: ${data.id}`)
  }

  // ── delete_journal_entry ───────────────────────────────────────────────────
  if (toolName === 'delete_journal_entry') {
    if (!args.entry_id) return mcpError(id, -32602, 'entry_id is required')
    const { data: existing } = await db.from('journal_entries').select('id, content').eq('id', args.entry_id).eq('user_id', userId).maybeSingle()
    if (!existing) return mcpError(id, -32602, `Journal entry ${args.entry_id} not found`)
    const { error } = await db.from('journal_entries').delete().eq('id', args.entry_id)
    if (error) return mcpError(id, -32603, `Failed to delete entry: ${error.message}`)
    return mcpOk(id, `🗑️ Journal entry deleted.`)
  }

  // ── list_goals ─────────────────────────────────────────────────────────────
  if (toolName === 'list_goals') {
    try {
      let query = db.from('goals').select('id, title, description, status, progress, target_date, category, created_at').eq('user_id', userId).order('created_at', { ascending: false })
      if (args.status) query = query.eq('status', args.status)
      const { data, error } = await query
      if (error) throw error
      return mcpOk(id, JSON.stringify(data || [], null, 2))
    } catch (err) {
      return mcpOk(id, JSON.stringify([], null, 2))
    }
  }

  // ── create_goal ────────────────────────────────────────────────────────────
  if (toolName === 'create_goal') {
    if (!args.title?.trim()) return mcpError(id, -32602, 'title is required')
    try {
      const { data, error } = await db.from('goals').insert({
        user_id: userId,
        title: args.title.trim(),
        description: args.description || null,
        target_date: args.target_date || null,
        category: args.category || null,
        status: 'active',
        progress: 0,
      }).select('id, title, status, category').single()
      if (error) throw error
      return mcpOk(id, `🎯 Goal created!\n\nID: ${data.id}\nTitle: ${data.title}${data.category ? `\nCategory: ${data.category}` : ''}\nStatus: Active`)
    } catch (err) {
      return mcpError(id, -32603, `Failed to create goal: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // ── update_goal ────────────────────────────────────────────────────────────
  if (toolName === 'update_goal') {
    if (!args.goal_id) return mcpError(id, -32602, 'goal_id is required')
    try {
      const { data: existing } = await db.from('goals').select('id, title').eq('id', args.goal_id).eq('user_id', userId).maybeSingle()
      if (!existing) return mcpError(id, -32602, `Goal ${args.goal_id} not found`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {}
      if (args.title !== undefined) updates.title = args.title.trim()
      if (args.description !== undefined) updates.description = args.description
      if (args.status !== undefined) updates.status = args.status
      if (args.progress !== undefined) updates.progress = Math.min(100, Math.max(0, args.progress))
      const { data, error } = await db.from('goals').update(updates).eq('id', args.goal_id).select('id, title, status, progress').single()
      if (error) throw error
      return mcpOk(id, `✅ Goal updated!\n\nID: ${data.id}\nTitle: ${data.title}\nStatus: ${data.status}\nProgress: ${data.progress}%`)
    } catch (err) {
      return mcpError(id, -32603, `Failed to update goal: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // ── delete_goal ────────────────────────────────────────────────────────────
  if (toolName === 'delete_goal') {
    if (!args.goal_id) return mcpError(id, -32602, 'goal_id is required')
    try {
      const { data: existing } = await db.from('goals').select('id, title').eq('id', args.goal_id).eq('user_id', userId).maybeSingle()
      if (!existing) return mcpError(id, -32602, `Goal ${args.goal_id} not found`)
      const { error } = await db.from('goals').delete().eq('id', args.goal_id)
      if (error) throw error
      return mcpOk(id, `🗑️ Goal "${existing.title}" deleted.`)
    } catch (err) {
      return mcpError(id, -32603, `Failed to delete goal: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // ── get_streaks ────────────────────────────────────────────────────────────
  if (toolName === 'get_streaks') {
    const { data: profile } = await db.from('profiles')
      .select('display_name, life_score, current_streak, longest_streak, total_tasks_completed')
      .eq('id', userId).maybeSingle()
    return mcpOk(id, JSON.stringify(profile || { current_streak: 0, longest_streak: 0, life_score: 0 }, null, 2))
  }

  return mcpError(id, -32601, `Tool "${toolName}" not found. Available tools: ${MCP_TOOLS.map(t => t.name).join(', ')}`)
}

// ─── CORS Headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

// ─── POST — MCP JSON-RPC + REST Actions ──────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await req.json()
    const userId = await getUserIdFromRequest(req)

    const { id, method, params } = body

    // ── Handle notifications (no-op responses per MCP spec) ──────────────────
    if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
      return new NextResponse(null, { status: 202, headers: CORS_HEADERS })
    }

    // ── ping ──────────────────────────────────────────────────────────────────
    if (method === 'ping') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: {} }, { headers: CORS_HEADERS })
    }

    // ── initialize — no auth required ─────────────────────────────────────────
    if (method === 'initialize') {
      // Negotiate protocol version: support both 2024-11-05 and 2025-03-26
      const clientVersion = params?.protocolVersion || '2024-11-05'
      const serverVersion = ['2025-03-26', '2024-11-05'].includes(clientVersion)
        ? clientVersion
        : '2024-11-05'
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: serverVersion,
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: { name: 'NIRMAAN OS', version: '2.0.0' }
        }
      }, { headers: CORS_HEADERS })
    }

    // ── All other methods require auth ────────────────────────────────────────
    if (!userId) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: id || null, error: { code: -32001, message: 'Unauthorized: valid Bearer token required' } },
        { status: 401, headers: { ...CORS_HEADERS, 'WWW-Authenticate': 'Bearer realm="NIRMAAN MCP"' } }
      )
    }

    // ── tools/list ────────────────────────────────────────────────────────────
    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS }
      }, { headers: CORS_HEADERS })
    }

    // ── tools/call ────────────────────────────────────────────────────────────
    if (method === 'tools/call') {
      const toolName = params?.name
      const args = params?.arguments || {}
      return await handleTool(toolName, args, userId, id)
    }

    // ── resources/list — stub ─────────────────────────────────────────────────
    if (method === 'resources/list') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: { resources: [] } }, { headers: CORS_HEADERS })
    }

    // ── prompts/list — stub ───────────────────────────────────────────────────
    if (method === 'prompts/list') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: { prompts: [] } }, { headers: CORS_HEADERS })
    }

    // ── REST shortcuts (for direct API consumers) ─────────────────────────────
    if (body.action === 'create_task' || (body.title && !method)) {
      return await handleTool('create_task', body, userId, id)
    }
    if (body.action === 'create_journal' || (body.content && !method)) {
      return await handleTool('create_journal_entry', body, userId, id)
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32601, message: `Method "${method}" not supported` }
    }, { headers: CORS_HEADERS })

  } catch (err: unknown) {
    console.error('[MCP] Unhandled error:', err)
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: err instanceof Error ? err.message : 'Internal MCP error' }
    }, { status: 500, headers: CORS_HEADERS })
  }
}

// ─── GET — Status + Dashboard ─────────────────────────────────────────────────

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

  // RFC 9728: Unauthenticated discovery
  if (!action && !userId) {
    return NextResponse.json(
      {
        error: 'unauthorized',
        message: 'NIRMAAN MCP Protocol Gateway — authenticate to use MCP tools',
        resource_metadata: prmUrl,
        authorization_server: authServerUrl,
      },
      {
        status: 401,
        headers: {
          ...CORS_HEADERS,
          'WWW-Authenticate': `Bearer realm="NIRMAAN MCP", resource_metadata="${prmUrl}"`,
        },
      }
    )
  }

  if (!action && userId) {
    return NextResponse.json({
      status: 'online',
      server: 'NIRMAAN MCP Protocol Gateway',
      version: '2.0.0',
      tools_count: MCP_TOOLS.length,
      tools: MCP_TOOLS.map(t => t.name),
      supported_clients: ['ChatGPT', 'Claude Desktop', 'Cursor', 'Windsurf'],
      endpoints: {
        mcp_jsonrpc: `${origin}/api/mcp`,
        openapi_spec: `${origin}/api/mcp/openapi.json`,
        oauth_metadata: authServerUrl,
        protected_resource_metadata: prmUrl,
      }
    }, { headers: CORS_HEADERS })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })
  }

  if (action === 'dashboard') {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
    const { data: todos } = await supabase.from('todos').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
    return NextResponse.json({ profile, tasks, todos }, { headers: CORS_HEADERS })
  }

  if (action === 'tasks') {
    const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    return NextResponse.json(tasks || [], { headers: CORS_HEADERS })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400, headers: CORS_HEADERS })
}

// ─── OPTIONS — CORS Preflight ─────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}
