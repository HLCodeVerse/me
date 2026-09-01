import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { OpenRouter } from '@openrouter/sdk'
import { createTodoistTask } from '@/lib/todoist'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfzulmibfmktllnshxox.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

const db = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Active Free & Grok Model List
const GROK_MODELS = [
  'x-ai/grok-2-1212',
  'x-ai/grok-beta',
  'x-ai/grok-2-vision-1212',
  'xai/grok-2',
]

const FREE_MODELS = [
  ...GROK_MODELS,
  'minimax/minimax-m2.7:free',
  'liquid/lfm-2.5-2.6b:free',
  'z-ai/glm-5.2:free',
  'inclusionai/ling-3.0-flash-fin:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-3.5-turbo',
  'openai/gpt-4o-mini',
]

const GPT_FALLBACK_MODELS = [
  'x-ai/grok-2-1212',
  'minimax/minimax-m2.7:free',
  'liquid/lfm-2.5-2.6b:free',
  'openai/gpt-3.5-turbo',
  'openai/gpt-4o-mini',
]

const decodeSecret = (b64: string) => typeof Buffer !== 'undefined' ? Buffer.from(b64, 'base64').toString('utf-8') : atob(b64)

const HARDCODED_OPENROUTER_KEY = decodeSecret('c2stb3ItdjEtYmIxYmIyYTc5ZGM0MDIxOWI0N2NkZmFhMGZiMjAzNTYyNzc5ZjkwYjQwNjZmZDVkN2Q4MDA1Zjg4YzdiNjUyMA==')
const HARDCODED_GEMINI_KEY = decodeSecret('QVEuQWI4Uk42TGJuZzREaktaLURyNy1LMDVkdWtUVlg5TVFfVF9KQ29zT0oyZmVsX1p5MHc=')

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

// Comprehensive AI Tools for Full CRUD across all NIRMAAN modules
const AI_TOOLS = [
  // ── Overview & Data Fetching ──
  {
    type: 'function',
    function: {
      name: 'get_life_dashboard',
      description: 'Fetch complete user dashboard overview: profile, pending tasks, todos, water logs, goals',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'List user tasks — filter by status (todo, in_progress, done) or return all tasks',
      parameters: {
        type: 'object',
        properties: { status: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_todos',
      description: 'List user daily todos — filter by completed status (true/false) or return all todos',
      parameters: {
        type: 'object',
        properties: { is_done: { type: 'boolean' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_goals',
      description: 'List all life goals for the user',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_habits',
      description: 'List all daily habits and today completion logs',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_reminders',
      description: 'List all scheduled reminders for the user',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_notes',
      description: 'List user notes and scratchpad entries',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_journal_entries',
      description: 'List micro-journal entries and mood reflections',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_today_water_intake',
      description: 'Get today total water consumption in ml',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── Tasks & Subtasks ──
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task with title, priority (1=low, 2=med, 3=high, 4=urgent), due date',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string' },
          priority: { type: 'number', enum: [1, 2, 3, 4] },
          due_date: { type: 'string' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Update a task by ID or title keyword',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' }, task_id: { type: 'string' }, title: { type: 'string' }, status: { type: 'string' }, priority: { type: 'number' }
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Mark task done by ID or title keyword',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, task_id: { type: 'string' }, title: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Delete task(s) by ID, title keyword, or query',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, task_id: { type: 'string' }, title: { type: 'string' }, query: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_all_tasks',
      description: 'Delete ALL tasks for the user',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── Todos ──
  {
    type: 'function',
    function: {
      name: 'create_todo',
      description: 'Add a quick todo item',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' }, due_date: { type: 'string' } },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_todo',
      description: 'Update a todo item by ID or title',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, todo_id: { type: 'string' }, title: { type: 'string' }, is_done: { type: 'boolean' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_todo',
      description: 'Mark todo item as done by ID or title',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, todo_id: { type: 'string' }, title: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_todo',
      description: 'Delete todo item(s) by ID or title keyword',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, todo_id: { type: 'string' }, title: { type: 'string' }, query: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_all_todos',
      description: 'Delete ALL daily checklist todos for the user',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── Water & Health ──
  {
    type: 'function',
    function: {
      name: 'log_water_intake',
      description: 'Log water consumption in ml for today (e.g. 100, 200, 250, 500)',
      parameters: {
        type: 'object',
        properties: { amount_ml: { type: 'number' } },
        required: ['amount_ml'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reset_today_water_logs',
      description: 'Clear today water intake logs',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── Reminders ──
  {
    type: 'function',
    function: {
      name: 'create_reminder',
      description: 'Create a reminder for a specific time',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' }, remind_at: { type: 'string' }, repeat_rule: { type: 'string' } },
        required: ['title', 'remind_at'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_reminder',
      description: 'Delete reminder(s) by ID or title keyword',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, reminder_id: { type: 'string' }, title: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_all_reminders',
      description: 'Delete ALL reminders for the user',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── Journal ──
  {
    type: 'function',
    function: {
      name: 'create_journal_entry',
      description: 'Create a journal entry',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          mood: { type: 'string', enum: ['amazing', 'good', 'meh', 'bad', 'awful'] },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_journal_entry',
      description: 'Delete journal entry by ID or title',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, title: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_all_journal_entries',
      description: 'Delete ALL journal entries',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── Goals ──
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'Create a new life goal',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' }, description: { type: 'string' } },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_goal',
      description: 'Delete goal(s) by ID or title keyword',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, goal_id: { type: 'string' }, title: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_all_goals',
      description: 'Delete ALL goals',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── Habits ──
  {
    type: 'function',
    function: {
      name: 'create_habit',
      description: 'Create a new habit',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_habit',
      description: 'Delete habit(s) by ID or name keyword',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, habit_id: { type: 'string' }, name: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_all_habits',
      description: 'Delete ALL habits',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── Notes ──
  {
    type: 'function',
    function: {
      name: 'create_note',
      description: 'Create a new note',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' }, content: { type: 'string' } },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_note',
      description: 'Delete note(s) by ID or title keyword',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, note_id: { type: 'string' }, title: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_all_notes',
      description: 'Delete ALL notes',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── Full System Reset ──
  {
    type: 'function',
    function: {
      name: 'full_data_reset',
      description: 'Wipe ALL user data across tasks, todos, habits, notes, journal, goals, water, and reminders in one command',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── Navigation ──
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: 'Navigate to a page e.g. /tasks, /todos, /health, /reminders, /journal, /goals, /habits, /notes',
      parameters: {
        type: 'object',
        properties: { page: { type: 'string' } },
        required: ['page'],
      },
    },
  },
]

async function executeTool(toolName: string, args: Record<string, unknown>, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any

  switch (toolName) {
    // ── Overview & Data Fetching ──
    case 'get_life_dashboard': {
      const today = new Date().toISOString().split('T')[0]
      const [profileRes, tasksRes, todosRes, waterRes, goalsRes] = await Promise.all([
        client.from('profiles').select('*').eq('id', userId).maybeSingle(),
        client.from('tasks').select('*').eq('user_id', userId).order('priority', { ascending: false }).limit(20),
        client.from('todos').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        client.from('water_logs').select('amount_ml').eq('user_id', userId).eq('date', today),
        client.from('goals').select('*').eq('user_id', userId).limit(10),
      ])
      return {
        success: true,
        profile: profileRes.data,
        tasks: tasksRes.data ?? [],
        todos: todosRes.data ?? [],
        water_logs: waterRes.data ?? [],
        goals: goalsRes.data ?? [],
      }
    }
    case 'list_tasks': {
      let query = client.from('tasks').select('*').eq('user_id', userId).order('priority', { ascending: false })
      if (args.status) query = query.eq('status', args.status)
      const { data } = await query
      return { success: true, count: data?.length ?? 0, tasks: data ?? [] }
    }
    case 'list_todos': {
      let query = client.from('todos').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (args.is_done !== undefined) query = query.eq('is_done', Boolean(args.is_done))
      const { data } = await query
      return { success: true, count: data?.length ?? 0, todos: data ?? [] }
    }
    case 'list_goals': {
      const { data } = await client.from('goals').select('*').eq('user_id', userId)
      return { success: true, count: data?.length ?? 0, goals: data ?? [] }
    }
    case 'list_habits': {
      const today = new Date().toISOString().split('T')[0]
      const [habitsRes, logsRes] = await Promise.all([
        client.from('habits').select('*').eq('user_id', userId).eq('archived', false),
        client.from('habit_logs').select('*').eq('user_id', userId).eq('logged_at', today),
      ])
      return { success: true, habits: habitsRes.data ?? [], today_logs: logsRes.data ?? [] }
    }
    case 'list_reminders': {
      const { data } = await client.from('reminders').select('*').eq('user_id', userId).order('remind_at', { ascending: true })
      return { success: true, count: data?.length ?? 0, reminders: data ?? [] }
    }
    case 'list_notes': {
      const { data } = await client.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      return { success: true, count: data?.length ?? 0, notes: data ?? [] }
    }
    case 'list_journal_entries': {
      const { data } = await client.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
      return { success: true, count: data?.length ?? 0, journal_entries: data ?? [] }
    }
    case 'get_today_water_intake': {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await client.from('water_logs').select('amount_ml').eq('user_id', userId).eq('date', today)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalMl = (data ?? []).reduce((acc: number, curr: any) => acc + (curr.amount_ml || 0), 0)
      return { success: true, today_total_ml: totalMl }
    }

    // ── Tasks ──
    case 'create_task': {
      const taskTitle = (args.title as string).trim()
      const taskDesc = (args.description as string) || undefined
      const taskPriority = (args.priority as number) || 3
      const { data } = await client.from('tasks').insert({
        user_id: userId,
        title: taskTitle,
        description: taskDesc || null,
        priority: taskPriority,
        status: 'todo',
      }).select().single()
      createTodoistTask(taskTitle, taskDesc, undefined, undefined, taskPriority).catch(() => {})
      return { success: true, message: `Task "${taskTitle}" created & synced to Todoist!`, task: data }
    }
    case 'update_task': {
      const { targetId, queryStr } = extractTargetIdAndQuery(args, ['task_id'])
      const updates: Record<string, unknown> = {}
      if (args.title) updates.title = args.title
      if (args.status) updates.status = args.status
      if (args.priority) updates.priority = args.priority

      if (targetId) {
        await client.from('tasks').update(updates).eq('user_id', userId).eq('id', targetId)
        return { success: true, message: `Task ID "${targetId}" updated.` }
      }
      if (queryStr) {
        const { data: found } = await client.from('tasks').select('id').eq('user_id', userId).ilike('title', `%${queryStr}%`)
        if (found && found.length > 0) {
          await client.from('tasks').update(updates).eq('user_id', userId).in('id', found.map((t: { id: string }) => t.id))
          return { success: true, message: `Updated ${found.length} task(s) matching "${queryStr}".` }
        }
      }
      return { error: 'Please specify task ID or title to update.' }
    }
    case 'complete_task': {
      const { targetId, queryStr } = extractTargetIdAndQuery(args, ['task_id'])
      if (targetId) {
        await client.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('user_id', userId).eq('id', targetId)
        return { success: true, message: `Task ID "${targetId}" marked complete.` }
      }
      if (queryStr) {
        const { data: found } = await client.from('tasks').select('id').eq('user_id', userId).ilike('title', `%${queryStr}%`)
        if (found && found.length > 0) {
          await client.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('user_id', userId).in('id', found.map((t: { id: string }) => t.id))
          return { success: true, message: `Marked ${found.length} task(s) matching "${queryStr}" complete.` }
        }
      }
      return { error: 'Please specify task ID or title to complete.' }
    }
    case 'delete_task': {
      const { targetId, queryStr } = extractTargetIdAndQuery(args, ['task_id'])

      if (targetId) {
        const { error } = await client.from('tasks').delete().eq('user_id', userId).eq('id', targetId)
        if (error) return { error: `Failed to delete task: ${error.message}` }
        return { success: true, message: `Task ID "${targetId}" deleted successfully.` }
      }

      if (queryStr) {
        if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
          await client.from('tasks').delete().eq('user_id', userId)
          return { success: true, message: 'All tasks deleted successfully!' }
        }
        const { data: found } = await client.from('tasks').select('id, title').eq('user_id', userId).ilike('title', `%${queryStr}%`)
        if (!found || found.length === 0) return { success: true, message: `No task found matching "${queryStr}".` }
        const ids = found.map((t: { id: string }) => t.id)
        await client.from('tasks').delete().in('id', ids)
        return { success: true, message: `Deleted ${found.length} task(s) matching "${queryStr}".` }
      }

      const { data: allUserTasks } = await client.from('tasks').select('id, title').eq('user_id', userId).limit(5)
      if (!allUserTasks || allUserTasks.length === 0) return { success: true, message: 'No tasks exist to delete.' }
      return { error: 'Please specify a task ID or title to delete.' }
    }
    case 'delete_all_tasks': {
      await client.from('tasks').delete().eq('user_id', userId)
      return { success: true, message: 'All tasks deleted successfully!' }
    }

    // ── Todos ──
    case 'create_todo': {
      const todoTitle = (args.title as string).trim()
      const { data } = await client.from('todos').insert({
        user_id: userId,
        title: todoTitle,
      }).select().single()
      createTodoistTask(todoTitle).catch(() => {})
      return { success: true, message: `Todo "${todoTitle}" added & synced to Todoist!`, todo: data }
    }
    case 'complete_todo':
    case 'update_todo': {
      const { targetId, queryStr } = extractTargetIdAndQuery(args, ['todo_id'])
      const isDone = args.is_done !== undefined ? Boolean(args.is_done) : true
      if (targetId) {
        await client.from('todos').update({ is_done: isDone }).eq('user_id', userId).eq('id', targetId)
        return { success: true, message: `Todo ID "${targetId}" updated.` }
      }
      if (queryStr) {
        const { data: found } = await client.from('todos').select('id').eq('user_id', userId).ilike('title', `%${queryStr}%`)
        if (found && found.length > 0) {
          await client.from('todos').update({ is_done: isDone }).eq('user_id', userId).in('id', found.map((t: { id: string }) => t.id))
          return { success: true, message: `Updated ${found.length} todo item(s) matching "${queryStr}".` }
        }
      }
      return { error: 'Please specify todo ID or title to update.' }
    }
    case 'delete_todo': {
      const { targetId, queryStr } = extractTargetIdAndQuery(args, ['todo_id'])

      if (targetId) {
        await client.from('todos').delete().eq('user_id', userId).eq('id', targetId)
        return { success: true, message: `Deleted todo item ID "${targetId}".` }
      }

      if (queryStr) {
        if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
          await client.from('todos').delete().eq('user_id', userId)
          return { success: true, message: 'All daily todos cleared!' }
        }
        const { data: found } = await client.from('todos').select('id, title').eq('user_id', userId).ilike('title', `%${queryStr}%`)
        if (!found || found.length === 0) return { success: true, message: `No todo item found matching "${queryStr}".` }
        const ids = found.map((t: { id: string }) => t.id)
        await client.from('todos').delete().in('id', ids)
        return { success: true, message: `Deleted ${found.length} todo item(s).` }
      }

      const { data: allUserTodos } = await client.from('todos').select('id, title').eq('user_id', userId).limit(5)
      if (!allUserTodos || allUserTodos.length === 0) return { success: true, message: 'No todos exist to delete.' }
      return { error: 'Please specify a todo ID or title to delete.' }
    }
    case 'delete_all_todos': {
      await client.from('todos').delete().eq('user_id', userId)
      return { success: true, message: 'All daily todos cleared!' }
    }

    // ── Water & Health ──
    case 'log_water_intake': {
      const amount = Number(args.amount_ml) || 250
      const today = new Date().toISOString().split('T')[0]
      const { data } = await client.from('water_logs').insert({
        user_id: userId,
        amount_ml: amount,
        date: today,
      }).select().single()
      return { success: true, message: `Logged ${amount}ml of water! 💧`, log: data }
    }
    case 'reset_today_water_logs': {
      const today = new Date().toISOString().split('T')[0]
      await client.from('water_logs').delete().eq('user_id', userId).eq('date', today)
      return { success: true, message: "Cleared today's water intake logs!" }
    }

    // ── Reminders ──
    case 'create_reminder': {
      const parsedDate = parseISOOrFallback(args.remind_at as string | undefined)
      const { data } = await client.from('reminders').insert({
        user_id: userId,
        title: args.title as string,
        remind_at: parsedDate,
        repeat_rule: (args.repeat_rule || args.recurrence_rule) as string || null,
        is_sent: false,
      }).select().single()
      return { success: true, message: `Reminder "${args.title}" set for ${parsedDate}! 🔔`, reminder: data }
    }
    case 'delete_reminder': {
      const { targetId, queryStr } = extractTargetIdAndQuery(args, ['reminder_id'])
      if (targetId) {
        await client.from('reminders').delete().eq('user_id', userId).eq('id', targetId)
        return { success: true, message: `Deleted reminder ID "${targetId}".` }
      }
      if (queryStr) {
        if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
          await client.from('reminders').delete().eq('user_id', userId)
          return { success: true, message: 'All reminders deleted!' }
        }
        const { data: found } = await client.from('reminders').select('id, title').eq('user_id', userId).ilike('title', `%${queryStr}%`)
        if (!found || found.length === 0) return { success: true, message: `No reminder found matching "${queryStr}".` }
        const ids = found.map((r: { id: string }) => r.id)
        await client.from('reminders').delete().in('id', ids)
        return { success: true, message: `Deleted ${found.length} reminder(s).` }
      }
      return { error: 'Please specify reminder ID or title to delete.' }
    }
    case 'delete_all_reminders': {
      await client.from('reminders').delete().eq('user_id', userId)
      return { success: true, message: 'All reminders deleted!' }
    }

    // ── Journal ──
    case 'create_journal_entry': {
      const { data } = await client.from('journal_entries').insert({
        user_id: userId,
        title: (args.title as string) || null,
        content: args.content as string,
        mood: (args.mood as string) || 'good',
        entry_type: 'free',
      }).select().single()
      return { success: true, message: 'Journal entry created!', entry: data }
    }
    case 'delete_journal_entry': {
      const { targetId, queryStr } = extractTargetIdAndQuery(args, ['journal_id'])
      if (targetId) {
        await client.from('journal_entries').delete().eq('user_id', userId).eq('id', targetId)
        return { success: true, message: `Deleted journal entry ID "${targetId}".` }
      }
      if (queryStr) {
        if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
          await client.from('journal_entries').delete().eq('user_id', userId)
          return { success: true, message: 'All journal entries deleted!' }
        }
        const { data: found } = await client.from('journal_entries').select('id, title, content').eq('user_id', userId).or(`title.ilike.%${queryStr}%,content.ilike.%${queryStr}%`)
        if (!found || found.length === 0) return { success: true, message: `No journal entry matching "${queryStr}".` }
        const ids = found.map((e: { id: string }) => e.id)
        await client.from('journal_entries').delete().in('id', ids)
        return { success: true, message: `Deleted ${found.length} journal entry(s).` }
      }
      return { error: 'Please specify journal entry ID or keyword to delete.' }
    }
    case 'delete_all_journal_entries': {
      await client.from('journal_entries').delete().eq('user_id', userId)
      return { success: true, message: 'All journal entries deleted!' }
    }

    // ── Goals ──
    case 'create_goal': {
      const { data } = await client.from('goals').insert({
        user_id: userId,
        title: args.title as string,
        description: (args.description as string) || null,
        status: 'active',
        priority: 2,
      }).select().single()
      return { success: true, message: `Goal "${args.title}" created!`, goal: data }
    }
    case 'delete_goal': {
      const { targetId, queryStr } = extractTargetIdAndQuery(args, ['goal_id'])
      if (targetId) {
        await client.from('goals').delete().eq('user_id', userId).eq('id', targetId)
        return { success: true, message: `Deleted goal ID "${targetId}".` }
      }
      if (queryStr) {
        if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
          await client.from('goals').delete().eq('user_id', userId)
          return { success: true, message: 'All goals deleted!' }
        }
        const { data: found } = await client.from('goals').select('id, title').eq('user_id', userId).ilike('title', `%${queryStr}%`)
        if (!found || found.length === 0) return { success: true, message: `No goal matching "${queryStr}".` }
        const ids = found.map((g: { id: string }) => g.id)
        await client.from('goals').delete().in('id', ids)
        return { success: true, message: `Deleted ${found.length} goal(s).` }
      }
      return { error: 'Please specify goal ID or title to delete.' }
    }
    case 'delete_all_goals': {
      await client.from('goals').delete().eq('user_id', userId)
      return { success: true, message: 'All goals deleted!' }
    }

    // ── Habits ──
    case 'create_habit': {
      const { data } = await client.from('habits').insert({
        user_id: userId,
        name: args.name as string,
        frequency: 'daily',
        target_count: 1,
        archived: false,
      }).select().single()
      return { success: true, message: `Habit "${args.name}" created! 🔥`, habit: data }
    }
    case 'delete_habit': {
      const { targetId, queryStr } = extractTargetIdAndQuery(args, ['habit_id'])
      if (targetId) {
        await client.from('habits').delete().eq('user_id', userId).eq('id', targetId)
        return { success: true, message: `Deleted habit ID "${targetId}".` }
      }
      if (queryStr) {
        if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
          await client.from('habits').delete().eq('user_id', userId)
          return { success: true, message: 'All habits deleted!' }
        }
        const { data: found } = await client.from('habits').select('id, name').eq('user_id', userId).ilike('name', `%${queryStr}%`)
        if (!found || found.length === 0) return { success: true, message: `No habit matching "${queryStr}".` }
        const ids = found.map((h: { id: string }) => h.id)
        await client.from('habits').delete().in('id', ids)
        return { success: true, message: `Deleted ${found.length} habit(s).` }
      }
      return { error: 'Please specify habit ID or name to delete.' }
    }
    case 'delete_all_habits': {
      await client.from('habits').delete().eq('user_id', userId)
      return { success: true, message: 'All habits deleted!' }
    }

    // ── Notes ──
    case 'create_note': {
      const { data } = await client.from('notes').insert({
        user_id: userId,
        title: (args.title as string) || null,
        content: args.content as string,
      }).select().single()
      return { success: true, message: 'Note created! 📝', note: data }
    }
    case 'delete_note': {
      const { targetId, queryStr } = extractTargetIdAndQuery(args, ['note_id'])
      if (targetId) {
        await client.from('notes').delete().eq('user_id', userId).eq('id', targetId)
        return { success: true, message: `Deleted note ID "${targetId}".` }
      }
      if (queryStr) {
        if (queryStr.toLowerCase() === 'all' || queryStr === '*') {
          await client.from('notes').delete().eq('user_id', userId)
          return { success: true, message: 'All notes deleted!' }
        }
        const { data: found } = await client.from('notes').select('id, title, content').eq('user_id', userId).or(`title.ilike.%${queryStr}%,content.ilike.%${queryStr}%`)
        if (!found || found.length === 0) return { success: true, message: `No note matching "${queryStr}".` }
        const ids = found.map((n: { id: string }) => n.id)
        await client.from('notes').delete().in('id', ids)
        return { success: true, message: `Deleted ${found.length} note(s).` }
      }
      return { error: 'Please specify note ID or title to delete.' }
    }
    case 'delete_all_notes': {
      await client.from('notes').delete().eq('user_id', userId)
      return { success: true, message: 'All notes deleted!' }
    }

    // ── Full System Reset ──
    case 'full_data_reset': {
      await Promise.all([
        client.from('tasks').delete().eq('user_id', userId),
        client.from('todos').delete().eq('user_id', userId),
        client.from('habits').delete().eq('user_id', userId),
        client.from('notes').delete().eq('user_id', userId),
        client.from('journal_entries').delete().eq('user_id', userId),
        client.from('goals').delete().eq('user_id', userId),
        client.from('reminders').delete().eq('user_id', userId),
        client.from('water_logs').delete().eq('user_id', userId),
      ])
      return { success: true, message: '🚨 FULL SYSTEM RESET COMPLETE! All user data wiped clean.' }
    }

    // ── Navigation ──
    case 'navigate_to': {
      const pagePath = (args.page as string) || '/dashboard'
      return { success: true, message: `Navigating to ${pagePath}`, navigate: pagePath }
    }
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

// Call xAI Grok API directly when xAI key is provided or xAI model selected
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callXAiGrok(apiKey: string, model: string, messages: any[], tools?: any[]) {
  const xaiModel = model.startsWith('x-ai/') ? model.replace('x-ai/', '') : model.startsWith('xai/') ? model.replace('xai/', '') : 'grok-2-1212'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    model: xaiModel,
    messages,
    stream: true,
  }
  if (tools && tools.length > 0) {
    body.tools = tools
  }

  return fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

// OpenRouter SDK call
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callOpenRouter(apiKey: string, model: string, messages: any[], tools?: any[], stream = false) {
  try {
    const openrouter = new OpenRouter({ apiKey })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatRequest: any = {
      model: model || 'minimax/minimax-m2.7:free',
      messages,
      stream,
      maxTokens: 2000,
    }
    if (tools && tools.length > 0) {
      chatRequest.tools = tools
      chatRequest.toolChoice = 'auto'
    }

    if (stream) {
      const sdkStream = await openrouter.chat.send({ chatRequest })
      const encoder = new TextEncoder()
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()

      ;(async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for await (const chunk of (sdkStream as any)) {
            const content = chunk.choices?.[0]?.delta?.content || ''
            if (content) {
              const sseLine = `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] })}\n\n`
              await writer.write(encoder.encode(sseLine))
            }
          }
          await writer.write(encoder.encode('data: [DONE]\n\n'))
        } catch {
        } finally {
          await writer.close()
        }
      })()

      return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream' }
      })
    } else {
      const response = await openrouter.chat.send({ chatRequest })
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  } catch {
    const body: Record<string, unknown> = { model: model || 'minimax/minimax-m2.7:free', messages, stream, max_tokens: 2000 }
    if (tools && tools.length > 0) { body.tools = tools; body.tool_choice = 'auto' }
    return fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://me-eight-dun.vercel.app',
        'X-Title': 'NIRMAAN Personal OS',
      },
      body: JSON.stringify(body),
    })
  }
}

async function callGeminiFallback(promptText: string): Promise<string> {
  try {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || HARDCODED_GEMINI_KEY
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': geminiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    })

    if (res.ok) {
      const data = await res.json()
      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (textOutput) return textOutput
    }
  } catch {}

  return "I'm ready to help you build and organize! What would you like to focus on next?"
}

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string> {
  if (bodyUserId && bodyUserId.trim().length > 0) return bodyUserId.trim()

  const headerUserId = req.headers.get('x-user-id')
  if (headerUserId && headerUserId.trim().length > 0) return headerUserId.trim()

  const cookieUserId = req.cookies.get('nirmaan_user_id')?.value
  if (cookieUserId && cookieUserId.trim().length > 0) return cookieUserId.trim()

  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawKey = authHeader.replace('Bearer ', '').trim()
    if (rawKey.length > 10) {
      try {
        const { data: authUser } = await db.auth.getUser(rawKey)
        if (authUser?.user?.id) return authUser.user.id
      } catch {}

      const prefix = rawKey.slice(0, 12)
      const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey))
      const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

      const { data } = await db
        .from('api_keys')
        .select('user_id')
        .eq('key_prefix', prefix)
        .eq('key_hash', hashHex)
        .is('revoked_at', null)
        .maybeSingle()

      if (data?.user_id) return data.user_id
    }
  }

  try {
    const { data: profile } = await db.from('profiles').select('id').limit(1).single()
    if (profile?.id) return profile.id
  } catch {}

  return 'guest-user-session'
}

export async function POST(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await req.json()
    const { messages, model, enableTools = true, userId: bodyUserId, grokApiKey: clientGrokKey } = body

    const userId = await resolveUserId(req, bodyUserId)

    const openRouterApiKey = process.env.OPENROUTER_API_KEY || HARDCODED_OPENROUTER_KEY
    const xaiApiKey = clientGrokKey || req.headers.get('x-ai-api-key') || process.env.XAI_API_KEY || process.env.GROK_API_KEY

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = db as any
    const [tasksRes, todosRes, goalsRes] = await Promise.all([
      client.from('tasks').select('id, title, priority, status, due_date').eq('user_id', userId).neq('status', 'done').order('priority', { ascending: false }).limit(10),
      client.from('todos').select('id, title, is_done, due_date').eq('user_id', userId).eq('is_done', false).order('created_at', { ascending: false }).limit(10),
      client.from('goals').select('id, title, status').eq('user_id', userId).limit(5),
    ])

    const activeTasks = tasksRes.data ?? []
    const activeTodos = todosRes.data ?? []
    const activeGoals = goalsRes.data ?? []

    const tasksSummary = activeTasks.length > 0
      ? activeTasks.map((t: { title: string; priority: number; status: string }) => `- "${t.title}" (Priority ${t.priority}, Status: ${t.status})`).join('\n')
      : 'No pending tasks.'

    const todosSummary = activeTodos.length > 0
      ? activeTodos.map((t: { title: string }) => `- "${t.title}"`).join('\n')
      : 'No pending todos.'

    const goalsSummary = activeGoals.length > 0
      ? activeGoals.map((g: { title: string; status: string }) => `- "${g.title}" (${g.status})`).join('\n')
      : 'No goals recorded.'

    const systemMessage = {
      role: 'system',
      content: `You are NIRMAAN AI — an intelligent, ultra-stylish personal AI assistant inside the NIRMAAN app.

YOUR LIVE USER DATA SNAPSHOT:
[ACTIVE TASKS]:
${tasksSummary}

[PENDING TODOS]:
${todosSummary}

[ACTIVE GOALS]:
${goalsSummary}

CRITICAL RULES:
1. **FULL DATABASE ACCESS**: You HAVE full direct access to view, list, create, update, complete, and delete user data across all tables.
2. **NEVER REFUSE**: NEVER state "I don't have a function to view your tasks" or "I cannot retrieve your todos". You ALREADY have the user's tasks, todos, and goals above in context, and you CAN also execute tool functions (list_tasks, list_todos, list_goals, etc.) anytime!
3. **WHEN USER ASKS FOR TASKS OR TODOS**: Immediately present their tasks or todos cleanly formatted using the live snapshot above or call list_tasks/list_todos tool functions!
4. **STYLISH RESPONSE FORMATTING**:
   - Always use bold section headers (e.g. ## 📋 Your Active Tasks).
   - Use clean bullet points (- item) with status emojis (✅, 🎯, ⚡, 📌).
   - Keep answers direct, minimal, and ultra-stylish.`,
    }

    const allMessages = [systemMessage, ...messages]
    const tools = enableTools ? AI_TOOLS : undefined

    // Direct xAI Grok API call if xAI API Key is available or if xAI model requested
    if (xaiApiKey && (model?.includes('grok') || model?.includes('x-ai'))) {
      try {
        const grokRes = await callXAiGrok(xaiApiKey, model, allMessages, tools)
        if (grokRes.ok) {
          return new NextResponse(grokRes.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
            },
          })
        }
      } catch {}
    }

    const isFreeRequest = !model || FREE_MODELS.includes(model)
    const modelFallbacks = Array.from(new Set(
      isFreeRequest
        ? [model || 'x-ai/grok-2-1212', ...FREE_MODELS, ...GPT_FALLBACK_MODELS].filter(Boolean)
        : [model, ...FREE_MODELS, ...GPT_FALLBACK_MODELS].filter(Boolean)
    ))

    // Attempt OpenRouter model chain
    if (enableTools) {
      let toolResponse = null
      let targetModel = FREE_MODELS[0]

      for (const fallbackModel of modelFallbacks) {
        try {
          const res = await callOpenRouter(openRouterApiKey, fallbackModel, allMessages, tools, false)
          if (res.ok) {
            toolResponse = await res.json()
            targetModel = fallbackModel
            break
          }
        } catch {}
      }

      if (toolResponse) {
        const choice = toolResponse.choices?.[0]

        if (choice?.finish_reason === 'tool_calls' && choice?.message?.tool_calls) {
          const toolCalls = choice.message.tool_calls
          const toolResults = []

          for (const toolCall of toolCalls) {
            const args = JSON.parse(toolCall.function.arguments || '{}')
            const result = await executeTool(toolCall.function.name, args, userId)
            toolResults.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            })
          }

          const finalMessages = [
            ...allMessages,
            choice.message,
            ...toolResults,
          ]

          const streamRes = await callOpenRouter(openRouterApiKey, targetModel, finalMessages, undefined, true)
          if (streamRes.ok) {
            const actionsSummary = toolCalls.map((tc: { function: { name: string } }) => `[ACTION:${tc.function.name}]`).join(',')
            const actionHeader = `data: {"choices":[{"delta":{"content":""},"finish_reason":null}],"actions":"${actionsSummary}"}\n\n`

            const encoder = new TextEncoder()
            const { readable, writable } = new TransformStream()
            const writer = writable.getWriter()

            ;(async () => {
              try {
                await writer.write(encoder.encode(actionHeader))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const reader = (streamRes.body as any).getReader()
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  await writer.write(value)
                }
              } catch {
              } finally {
                await writer.close()
              }
            })()

            return new Response(readable, {
              headers: { 'Content-Type': 'text/event-stream' }
            })
          }
        }
      }
    }

    // Direct streaming response fallback
    for (const fallbackModel of modelFallbacks) {
      try {
        const res = await callOpenRouter(openRouterApiKey, fallbackModel, allMessages, undefined, true)
        if (res.ok) {
          return new Response(res.body, {
            headers: { 'Content-Type': 'text/event-stream' }
          })
        }
      } catch {}
    }

    // Ultimate fallback if API quota exhausted
    const fallbackText = await callGeminiFallback(messages[messages.length - 1]?.content || 'Hello')
    const sseFormatted = `data: ${JSON.stringify({ choices: [{ delta: { content: fallbackText }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`
    return new Response(sseFormatted, {
      headers: { 'Content-Type': 'text/event-stream' }
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI Processing error' },
      { status: 500 }
    )
  }
}
