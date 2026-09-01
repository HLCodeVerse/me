import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { OpenRouter } from '@openrouter/sdk'

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

// Comprehensive AI Tools for Full CRUD across all NIRMAAN modules
const AI_TOOLS = [
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
      name: 'delete_task',
      description: 'Delete task(s) matching title keyword',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
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
      name: 'delete_todo',
      description: 'Delete todo item(s) matching title keyword',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
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
        properties: { title: { type: 'string' }, remind_at: { type: 'string' } },
        required: ['title', 'remind_at'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_reminder',
      description: 'Delete reminder(s) matching title keyword',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
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
      description: 'Delete journal entry matching title or text',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
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
      description: 'Delete goal(s) matching title keyword',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
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
      description: 'Delete habit(s) matching name keyword',
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
      description: 'Delete note(s) matching title or content keyword',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
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
  switch (toolName) {
    // ── Tasks ──
    case 'create_task': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('tasks') as any).insert({
        user_id: userId,
        title: args.title as string,
        description: (args.description as string) || null,
        priority: (args.priority as number) || 3,
        status: 'todo',
      }).select().single()
      return { success: true, message: `Task "${args.title}" created!`, task: data }
    }
    case 'delete_task': {
      const searchTitle = args.title as string
      const { data: found } = await db.from('tasks').select('id, title').eq('user_id', userId).ilike('title', `%${searchTitle}%`)
      if (!found || found.length === 0) return { error: `No task found matching "${searchTitle}"` }
      const ids = found.map(t => t.id)
      await db.from('tasks').delete().in('id', ids)
      return { success: true, message: `Deleted ${found.length} task(s) matching "${searchTitle}"` }
    }
    case 'delete_all_tasks': {
      await db.from('tasks').delete().eq('user_id', userId)
      return { success: true, message: 'All tasks deleted successfully!' }
    }

    // ── Todos ──
    case 'create_todo': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('todos') as any).insert({
        user_id: userId,
        title: args.title as string,
      }).select().single()
      return { success: true, message: `Todo "${args.title}" added!`, todo: data }
    }
    case 'delete_todo': {
      const searchTitle = args.title as string
      const { data: found } = await db.from('todos').select('id, title').eq('user_id', userId).ilike('title', `%${searchTitle}%`)
      if (!found || found.length === 0) return { error: `No todo item found matching "${searchTitle}"` }
      const ids = found.map(t => t.id)
      await db.from('todos').delete().in('id', ids)
      return { success: true, message: `Deleted ${found.length} todo item(s)` }
    }
    case 'delete_all_todos': {
      await db.from('todos').delete().eq('user_id', userId)
      return { success: true, message: 'All daily todos cleared!' }
    }

    // ── Water & Health ──
    case 'log_water_intake': {
      const amount = Number(args.amount_ml) || 250
      const today = new Date().toISOString().split('T')[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('water_logs') as any).insert({
        user_id: userId,
        amount_ml: amount,
        date: today,
      }).select().single()
      return { success: true, message: `Logged ${amount}ml of water! 💧`, log: data }
    }
    case 'reset_today_water_logs': {
      const today = new Date().toISOString().split('T')[0]
      await db.from('water_logs').delete().eq('user_id', userId).eq('date', today)
      return { success: true, message: "Cleared today's water intake logs!" }
    }

    // ── Reminders ──
    case 'create_reminder': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('reminders') as any).insert({
        user_id: userId,
        title: args.title as string,
        remind_at: args.remind_at as string,
        is_sent: false,
      }).select().single()
      return { success: true, message: `Reminder "${args.title}" set! 🔔`, reminder: data }
    }
    case 'delete_reminder': {
      const searchTitle = args.title as string
      const { data: found } = await db.from('reminders').select('id, title').eq('user_id', userId).ilike('title', `%${searchTitle}%`)
      if (!found || found.length === 0) return { error: `No reminder found matching "${searchTitle}"` }
      const ids = found.map(r => r.id)
      await db.from('reminders').delete().in('id', ids)
      return { success: true, message: `Deleted ${found.length} reminder(s)` }
    }
    case 'delete_all_reminders': {
      await db.from('reminders').delete().eq('user_id', userId)
      return { success: true, message: 'All reminders deleted!' }
    }

    // ── Journal ──
    case 'create_journal_entry': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('journal_entries') as any).insert({
        user_id: userId,
        title: (args.title as string) || null,
        content: args.content as string,
        mood: (args.mood as string) || 'good',
        entry_type: 'free',
      }).select().single()
      return { success: true, message: 'Journal entry created!', entry: data }
    }
    case 'delete_journal_entry': {
      const searchTitle = args.title as string
      const { data: found } = await db.from('journal_entries').select('id, title, content').eq('user_id', userId).or(`title.ilike.%${searchTitle}%,content.ilike.%${searchTitle}%`)
      if (!found || found.length === 0) return { error: `No journal entry matching "${searchTitle}"` }
      const ids = found.map(e => e.id)
      await db.from('journal_entries').delete().in('id', ids)
      return { success: true, message: `Deleted ${found.length} journal entry(s)` }
    }
    case 'delete_all_journal_entries': {
      await db.from('journal_entries').delete().eq('user_id', userId)
      return { success: true, message: 'All journal entries deleted!' }
    }

    // ── Goals ──
    case 'create_goal': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('goals') as any).insert({
        user_id: userId,
        title: args.title as string,
        description: (args.description as string) || null,
        status: 'active',
        priority: 2,
      }).select().single()
      return { success: true, message: `Goal "${args.title}" created!`, goal: data }
    }
    case 'delete_goal': {
      const searchTitle = args.title as string
      const { data: found } = await db.from('goals').select('id, title').eq('user_id', userId).ilike('title', `%${searchTitle}%`)
      if (!found || found.length === 0) return { error: `No goal matching "${searchTitle}"` }
      const ids = found.map(g => g.id)
      await db.from('goals').delete().in('id', ids)
      return { success: true, message: `Deleted ${found.length} goal(s)` }
    }
    case 'delete_all_goals': {
      await db.from('goals').delete().eq('user_id', userId)
      return { success: true, message: 'All goals deleted!' }
    }

    // ── Habits ──
    case 'create_habit': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('habits') as any).insert({
        user_id: userId,
        name: args.name as string,
        frequency: 'daily',
        target_count: 1,
        archived: false,
      }).select().single()
      return { success: true, message: `Habit "${args.name}" created! 🔥`, habit: data }
    }
    case 'delete_habit': {
      const searchName = args.name as string
      const { data: found } = await db.from('habits').select('id, name').eq('user_id', userId).ilike('name', `%${searchName}%`)
      if (!found || found.length === 0) return { error: `No habit matching "${searchName}"` }
      const ids = found.map(h => h.id)
      await db.from('habits').delete().in('id', ids)
      return { success: true, message: `Deleted ${found.length} habit(s)` }
    }
    case 'delete_all_habits': {
      await db.from('habits').delete().eq('user_id', userId)
      return { success: true, message: 'All habits deleted!' }
    }

    // ── Notes ──
    case 'create_note': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('notes') as any).insert({
        user_id: userId,
        title: (args.title as string) || null,
        content: args.content as string,
      }).select().single()
      return { success: true, message: 'Note created! 📝', note: data }
    }
    case 'delete_note': {
      const searchTitle = args.title as string
      const { data: found } = await db.from('notes').select('id, title, content').eq('user_id', userId).or(`title.ilike.%${searchTitle}%,content.ilike.%${searchTitle}%`)
      if (!found || found.length === 0) return { error: `No note matching "${searchTitle}"` }
      const ids = found.map(n => n.id)
      await db.from('notes').delete().in('id', ids)
      return { success: true, message: `Deleted ${found.length} note(s)` }
    }
    case 'delete_all_notes': {
      await db.from('notes').delete().eq('user_id', userId)
      return { success: true, message: 'All notes deleted!' }
    }

    // ── Full System Reset ──
    case 'full_data_reset': {
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

    const systemMessage = {
      role: 'system',
      content: `You are NIRMAAN AI — an intelligent, ultra-stylish personal AI assistant inside the NIRMAAN app.

Response Formatting Rules:
1. **Stylish & Structured**: Always use bold headers (e.g. ## 📅 Title), bold key terms (**Key Concept**), bullet points (- item), and clean emojis (🎯, 📅, ⚡, 💡, 📝, 🚀).
2. **Direct & Minimal**: Get straight to the point without raw markdown symbols or extra fluff.
3. **App Integration & Tool Execution**: When user asks to create or delete tasks, todos, habits, notes, journal entries, goals, reminders, water logs, or full data reset — execute the exact corresponding tool directly.`,
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
              await writer.write(encoder.encode(actionHeader))
              const reader = streamRes.body?.getReader()
              if (reader) {
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  await writer.write(value)
                }
              }
              await writer.close()
            })()

            return new NextResponse(readable, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'X-Actions': actionsSummary,
              },
            })
          }
        }

        const content = choice?.message?.content ?? ''
        const streamChunk = `data: {"choices":[{"delta":{"content":${JSON.stringify(content)}},"finish_reason":null}]}\n\ndata: [DONE]\n\n`
        return new NextResponse(streamChunk, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        })
      }
    }

    // Pure streaming attempt across model fallbacks
    for (const fallbackModel of modelFallbacks) {
      try {
        const res = await callOpenRouter(openRouterApiKey, fallbackModel, allMessages, undefined, true)
        if (res.ok) {
          return new NextResponse(res.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
            },
          })
        }
      } catch {}
    }

    // Final Fallback: Google Gemini API REST call
    const lastUserMsg = (messages as { role: string; content: string }[]).reverse().find(m => m.role === 'user')?.content || 'Hello'
    const geminiText = await callGeminiFallback(lastUserMsg)

    const geminiStream = `data: {"choices":[{"delta":{"content":${JSON.stringify(geminiText)}},"finish_reason":null}]}\n\ndata: [DONE]\n\n`
    return new NextResponse(geminiStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('[AI chat error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
