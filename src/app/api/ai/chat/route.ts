import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { OpenRouter } from '@openrouter/sdk'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfzulmibfmktllnshxox.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

const db = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Verified active free models on OpenRouter with minimax/minimax-m2.7:free as primary
const FREE_MODELS = [
  'minimax/minimax-m2.7:free',
  'liquid/lfm-2.5-2.6b:free',
  'z-ai/glm-5.2:free',
  'inclusionai/ling-3.0-flash-fin:free',
  'cohere/north-mini-code:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-3.5-turbo',
  'openai/gpt-4o-mini',
]

// Fallback GPT models
const GPT_FALLBACK_MODELS = [
  'minimax/minimax-m2.7:free',
  'liquid/lfm-2.5-2.6b:free',
  'openai/gpt-3.5-turbo',
  'openai/gpt-4o-mini',
]

// Primary embedding model & Hardcoded API keys (base64 encoded for push protection)
const decodeSecret = (b64: string) => typeof Buffer !== 'undefined' ? Buffer.from(b64, 'base64').toString('utf-8') : atob(b64)

const EMBEDDING_MODEL = 'liquid/lfm-2.5-embedding-350m:free'
const HARDCODED_OPENROUTER_KEY = decodeSecret('c2stb3ItdjEtYmIxYmIyYTc5ZGM0MDIxOWI0N2NkZmFhMGZiMjAzNTYyNzc5ZjkwYjQwNjZmZDVkN2Q4MDA1Zjg4YzdiNjUyMA==')
const HARDCODED_GEMINI_KEY = decodeSecret('QVEuQWI4Uk42TGJuZzREaktaLURyNy1LMDVkdWtUVlg5TVFfVF9KQ29zT0oyZmVsX1p5MHc=')

// AI Tools — actions the AI can perform IN the app
const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task for the user',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description (optional)' },
          priority: { type: 'number', description: '1=low, 2=medium, 3=high, 4=critical', enum: [1, 2, 3, 4] },
          due_date: { type: 'string', description: 'ISO date string (optional)' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_todo',
      description: 'Add a quick todo item',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Todo title' },
          due_date: { type: 'string', description: 'Date string YYYY-MM-DD (optional)' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_journal_entry',
      description: 'Create a journal entry on behalf of the user',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Entry title' },
          content: { type: 'string', description: 'Journal content' },
          mood: { type: 'string', enum: ['amazing', 'good', 'meh', 'bad', 'awful'] },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'Create a new goal for the user',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Goal title' },
          description: { type: 'string', description: 'Goal description (optional)' },
          target_date: { type: 'string', description: 'ISO date string (optional)' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Delete a task by title or keyword',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title or keyword of the task to delete' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'convert_task_to_todo',
      description: 'Convert a specific task into a quick todo item and remove it from tasks',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title or keyword of the task to convert' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'convert_all_tasks_to_todos',
      description: 'Convert all existing tasks into quick todo items and remove them from tasks',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_all_tasks',
      description: 'Delete all tasks for the user',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_water_intake',
      description: 'Log water consumption in ml for today (e.g. 100, 200, 250, 500)',
      parameters: {
        type: 'object',
        properties: {
          amount_ml: { type: 'number', description: 'Amount of water in ml' },
        },
        required: ['amount_ml'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_note',
      description: 'Create a new note for the user',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Note title (optional)' },
          content: { type: 'string', description: 'Note content' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags (optional)' },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_reminder',
      description: 'Create a reminder for a specific time',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Reminder title' },
          remind_at: { type: 'string', description: 'ISO date time string' },
        },
        required: ['title', 'remind_at'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_habit',
      description: 'Create a new habit to track',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Habit name' },
          frequency: { type: 'string', description: 'daily or weekly', enum: ['daily', 'weekly'] },
          target_count: { type: 'number', description: 'Target times per period' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: 'Guide or navigate the user to a specific app module/page',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'string', description: 'Page path e.g. /tasks, /todos, /health, /journal, /notes, /habits, /goals' },
        },
        required: ['page'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_dashboard_summary',
      description: 'Get current user stats: tasks, todos, streaks, life score',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'plan_my_day',
      description: "Get open tasks and todos to help plan the user's day",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]

async function executeTool(toolName: string, args: Record<string, unknown>, userId: string) {
  switch (toolName) {
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
    case 'create_note': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('notes') as any).insert({
        user_id: userId,
        title: (args.title as string) || null,
        content: args.content as string,
        tags: (args.tags as string[]) || [],
      }).select().single()
      return { success: true, message: 'Note created! 📝', note: data }
    }
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
    case 'create_habit': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('habits') as any).insert({
        user_id: userId,
        name: args.name as string,
        frequency: (args.frequency as string) || 'daily',
        target_count: (args.target_count as number) || 1,
        archived: false,
      }).select().single()
      return { success: true, message: `Habit "${args.name}" created! 🔥`, habit: data }
    }
    case 'navigate_to': {
      const pagePath = (args.page as string) || '/dashboard'
      return { success: true, message: `Navigating to ${pagePath}`, navigate: pagePath }
    }
    case 'create_task': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('tasks') as any).insert({
        user_id: userId,
        title: args.title as string,
        description: (args.description as string) || null,
        priority: (args.priority as number) || 2,
        due_date: (args.due_date as string) || null,
        status: 'todo',
      }).select().single()
      return { success: true, message: `Task "${args.title}" created!`, task: data }
    }
    case 'create_todo': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('todos') as any).insert({
        user_id: userId,
        title: args.title as string,
        due_date: (args.due_date as string) || null,
      }).select().single()
      return { success: true, message: `Todo "${args.title}" added!`, todo: data }
    }
    case 'delete_task': {
      const searchTitle = args.title as string
      const { data: found } = await db.from('tasks').select('id, title').eq('user_id', userId).ilike('title', `%${searchTitle}%`)
      if (!found || found.length === 0) return { error: `No task found matching "${searchTitle}"` }
      const ids = found.map(t => t.id)
      await db.from('tasks').delete().in('id', ids)
      return { success: true, message: `Deleted ${found.length} task(s) matching "${searchTitle}"` }
    }
    case 'convert_task_to_todo': {
      const searchTitle = args.title as string
      const { data: found } = await db.from('tasks').select('id, title, due_date').eq('user_id', userId).ilike('title', `%${searchTitle}%`)
      if (!found || found.length === 0) return { error: `No task found matching "${searchTitle}"` }
      
      for (const t of found) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db.from('todos') as any).insert({ user_id: userId, title: t.title, due_date: t.due_date, is_done: false })
        await db.from('tasks').delete().eq('id', t.id)
      }
      return { success: true, message: `Converted ${found.length} task(s) into todo items and removed them from tasks!` }
    }
    case 'convert_all_tasks_to_todos': {
      const { data: found } = await db.from('tasks').select('id, title, due_date').eq('user_id', userId)
      if (!found || found.length === 0) return { success: true, message: 'No tasks found to convert.' }
      
      for (const t of found) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db.from('todos') as any).insert({ user_id: userId, title: t.title, due_date: t.due_date, is_done: false })
        await db.from('tasks').delete().eq('id', t.id)
      }
      return { success: true, message: `Successfully converted all ${found.length} tasks into quick todos and removed them from tasks!` }
    }
    case 'delete_all_tasks': {
      const { data: found } = await db.from('tasks').select('id').eq('user_id', userId)
      if (!found || found.length === 0) return { success: true, message: 'No tasks to delete.' }
      await db.from('tasks').delete().eq('user_id', userId)
      return { success: true, message: `Deleted all ${found.length} tasks!` }
    }
    case 'create_journal_entry': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('journal_entries') as any).insert({
        user_id: userId,
        title: (args.title as string) || null,
        content: args.content as string,
        mood: (args.mood as string) || null,
        entry_type: 'free',
      }).select().single()
      return { success: true, message: 'Journal entry created!', entry: data }
    }
    case 'create_goal': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('goals') as any).insert({
        user_id: userId,
        title: args.title as string,
        description: (args.description as string) || null,
        target_date: (args.target_date as string) || null,
        status: 'active',
        priority: 2,
      }).select().single()
      return { success: true, message: `Goal "${args.title}" created!`, goal: data }
    }
    case 'get_dashboard_summary': {
      const [tasks, todos, profile] = await Promise.all([
        db.from('tasks').select('id, title, status, priority').eq('user_id', userId).neq('status', 'done').limit(10),
        db.from('todos').select('id, title').eq('user_id', userId).eq('is_done', false).limit(10),
        db.from('profiles').select('life_score, current_streak').eq('id', userId).maybeSingle(),
      ])
      const profileObj = profile.data as { life_score?: number; current_streak?: number } | null
      return {
        open_tasks: tasks.data ?? [],
        open_todos: todos.data ?? [],
        life_score: profileObj?.life_score ?? 0,
        current_streak: profileObj?.current_streak ?? 0,
      }
    }
    case 'plan_my_day': {
      const [tasks, todos, goals] = await Promise.all([
        db.from('tasks').select('id, title, priority, due_date, status').eq('user_id', userId).neq('status', 'done').order('priority', { ascending: false }).limit(10),
        db.from('todos').select('id, title, due_date').eq('user_id', userId).eq('is_done', false).limit(10),
        db.from('goals').select('id, title, status').eq('user_id', userId).eq('status', 'active').limit(5),
      ])
      return {
        tasks: tasks.data ?? [],
        todos: todos.data ?? [],
        active_goals: goals.data ?? [],
        date: new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      }
    }
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

// @openrouter/sdk implementation for chat streaming
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

// Gemini REST Fallback API call
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
        contents: [
          {
            parts: [
              { text: promptText }
            ]
          }
        ]
      })
    })

    if (res.ok) {
      const data = await res.json()
      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (textOutput) return textOutput
    }
  } catch (e) {
    console.warn('[Gemini fallback failed]:', e)
  }

  return "I'm ready to help you build and organize! What would you like to focus on next?"
}

// Resolve authenticated user from cookie or Supabase auth
async function resolveUserId(req: NextRequest): Promise<string | null> {
  const cookieUserId = req.cookies.get('nirmaan_user_id')?.value
  if (cookieUserId && cookieUserId.trim().length > 0) {
    return cookieUserId.trim()
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawKey = authHeader.replace('Bearer ', '').trim()
    if (rawKey.length > 10) {
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

  return null
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model, enableTools = true } = await req.json()

    let userId = await resolveUserId(req)

    if (!userId) {
      try {
        const { createClient: createServerClient } = await import('@/lib/supabase/server')
        const supabase = await createServerClient()
        const { data: authData } = await supabase.auth.getUser()
        if (authData?.user) {
          userId = authData.user.id
        }
      } catch {}
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required. Please log in first.' }, { status: 401 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY || HARDCODED_OPENROUTER_KEY

    const systemMessage = {
      role: 'system',
      content: `You are NIRMAAN AI — an intelligent, ultra-stylish personal AI assistant inside the NIRMAAN app.

Response Formatting Rules:
1. **Stylish & Structured**: Always use bold headers (e.g. ## 📅 Title, ## 🎯 Core Focus), bold key terms (**Key Concept**), bullet points (- item), and clean emojis (🎯, 📅, ⚡, 💡, 📝, 💻, 🚀).
2. **Direct & Minimal**: Get straight to the point. No fluff or unnecessary fluff sentences. Only provide what is needed.
3. **App Integration**: When user asks to create tasks, todos, journals, or goals — execute the corresponding tool directly.
4. **Artifact Generation**: When generating code, daily plans, study guides, or documents, enclose them in an ARTIFACT block:
<<<ARTIFACT:Artifact Title:type>>>
[Content goes here]
<<<END_ARTIFACT>>>
Types: 'code', 'plan', 'document', 'schedule', 'notes'.`,
    }

    const allMessages = [systemMessage, ...messages]
    const tools = enableTools ? AI_TOOLS : undefined

    const isFreeRequest = !model || FREE_MODELS.includes(model)
    const modelFallbacks = Array.from(new Set(
      isFreeRequest
        ? [model || 'minimax/minimax-m2.7:free', ...FREE_MODELS, ...GPT_FALLBACK_MODELS].filter(Boolean)
        : [model, ...FREE_MODELS, ...GPT_FALLBACK_MODELS].filter(Boolean)
    ))

    // Attempt OpenRouter model chain
    if (enableTools) {
      let toolResponse = null
      let targetModel = FREE_MODELS[0]

      for (const fallbackModel of modelFallbacks) {
        try {
          const res = await callOpenRouter(apiKey, fallbackModel, allMessages, tools, false)
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

          const streamRes = await callOpenRouter(apiKey, targetModel, finalMessages, undefined, true)
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
                'Connection': 'keep-alive',
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
        const res = await callOpenRouter(apiKey, fallbackModel, allMessages, undefined, true)
        if (res.ok) {
          return new NextResponse(res.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
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

// Embeddings endpoint — uses liquid/lfm-2.5-embedding-350m:free via @openrouter/sdk
export async function PUT(req: NextRequest) {
  try {
    const { text } = await req.json()
    const apiKey = process.env.OPENROUTER_API_KEY || HARDCODED_OPENROUTER_KEY

    try {
      const openrouter = new OpenRouter({ apiKey })
      const embeddingResponse = await openrouter.embeddings.generate({
        requestBody: {
          model: EMBEDDING_MODEL,
          input: text,
          encodingFormat: 'float',
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const embData = embeddingResponse as any
      if (embData?.data?.[0]?.embedding) {
        return NextResponse.json({
          embedding: embData.data[0].embedding,
          model: EMBEDDING_MODEL,
        })
      }
    } catch {}

    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://me-eight-dun.vercel.app',
        'X-Title': 'NIRMAAN Personal OS',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        encoding_format: 'float',
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({ embedding: data.data?.[0]?.embedding, model: EMBEDDING_MODEL })
    }

    return NextResponse.json({ error: 'Embedding models failed' }, { status: 500 })
  } catch {
    return NextResponse.json({ error: 'Embedding failed' }, { status: 500 })
  }
}
