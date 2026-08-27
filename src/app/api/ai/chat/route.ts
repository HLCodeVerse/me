import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfzulmibfmktllnshxox.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

const db = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Free models in priority order — tested to work on OpenRouter
const FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'openchat/openchat-7b:free',
]

// Primary embedding model
const EMBEDDING_MODEL = 'liquid/lfm-2.5-embedding-350m:free'

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

async function callOpenRouter(apiKey: string, model: string, messages: unknown[], tools?: unknown[], stream = false) {
  const body: Record<string, unknown> = {
    model,
    messages,
    stream,
    max_tokens: 2000,
  }
  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

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

// Resolve authenticated user from cookie or Supabase auth
async function resolveUserId(req: NextRequest): Promise<string | null> {
  // 1. Direct mobile auth cookie (most reliable)
  const cookieUserId = req.cookies.get('nirmaan_user_id')?.value
  if (cookieUserId && cookieUserId.trim().length > 0) {
    return cookieUserId.trim()
  }

  // 2. API key auth
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

    // Resolve authenticated user
    let userId = await resolveUserId(req)

    // Fallback: try Supabase session cookie (for email/OAuth users)
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

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey || apiKey === 'sk-or-v1-fallback' || apiKey.length < 20) {
      return NextResponse.json({ error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in settings.' }, { status: 503 })
    }

    const systemMessage = {
      role: 'system',
      content: `You are NIRMAAN AI — a personal growth companion embedded in a productivity OS called NIRMAAN (निर्माण = "construction/rebuilding" in Hindi).

Your capabilities:
1. **Chat & Coaching**: Help users plan their day, reflect, overcome procrastination, and build habits.
2. **Direct Actions**: You can create tasks, todos, journal entries, and goals directly in the user's app using the tools provided.
3. **Context Awareness**: Always fetch the user's dashboard before giving personalized advice.

Personality: Direct, motivating, structured, and insightful. You care about the user's growth.
Formatting: Use **bold**, bullet points, and numbered lists for clarity. Keep responses concise.
Language: English (but understand Hindi/Hinglish from user).

When user asks to "add task", "create goal", "write journal" etc. — use the tool directly without asking for confirmation.
When user says "plan my day" — first call plan_my_day tool to get real data, then create a structured plan.`,
    }

    const allMessages = [systemMessage, ...messages]
    const tools = enableTools ? AI_TOOLS : undefined

    // Build model fallback chain
    const isFreeRequest = !model || FREE_MODELS.includes(model)
    const modelFallbacks = isFreeRequest
      ? [model, ...FREE_MODELS.filter(m => m !== model)].filter(Boolean)
      : [model, ...FREE_MODELS].filter(Boolean)

    // For tool calling — non-streaming first pass
    if (enableTools) {
      let toolResponse = null
      let targetModel = model || FREE_MODELS[0]

      for (const fallbackModel of modelFallbacks) {
        try {
          const res = await callOpenRouter(apiKey, fallbackModel, allMessages, tools, false)
          if (res.ok) {
            toolResponse = await res.json()
            targetModel = fallbackModel
            break
          } else {
            const errText = await res.text()
            console.warn(`[AI] Model ${fallbackModel} failed:`, res.status, errText.slice(0, 200))
          }
        } catch (e) {
          console.warn(`[AI] Model ${fallbackModel} threw:`, e)
        }
      }

      if (!toolResponse) {
        return NextResponse.json({ error: 'All AI models failed. Check your OpenRouter API key and try again.' }, { status: 500 })
      }

      const choice = toolResponse.choices?.[0]

      // Handle tool calls
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
        if (!streamRes.ok) {
          const errText = await streamRes.text()
          return NextResponse.json({ error: errText }, { status: streamRes.status })
        }

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

      // No tool calls — stream the response directly
      const content = choice?.message?.content ?? ''
      const streamChunk = `data: {"choices":[{"delta":{"content":${JSON.stringify(content)}},"finish_reason":null}]}\n\ndata: [DONE]\n\n`
      return new NextResponse(streamChunk, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
    }

    // Pure streaming without tools
    let streamResponse: Response | null = null
    for (const fallbackModel of modelFallbacks) {
      try {
        const res = await callOpenRouter(apiKey, fallbackModel, allMessages, undefined, true)
        if (res.ok) { streamResponse = res; break }
      } catch {}
    }

    if (!streamResponse) {
      return NextResponse.json({ error: 'All AI models failed. Check your OpenRouter API key and try again.' }, { status: 500 })
    }

    return new NextResponse(streamResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[AI chat error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Embeddings endpoint — uses liquid/lfm-2.5-embedding-350m:free as primary
export async function PUT(req: NextRequest) {
  try {
    const { text } = await req.json()
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey || apiKey.length < 20) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 503 })
    }

    // Try primary embedding model, then fallbacks
    const embeddingModels = [
      EMBEDDING_MODEL,
      'text-embedding-ada-002', // OpenAI fallback via OpenRouter
    ]

    for (const embModel of embeddingModels) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://me-eight-dun.vercel.app',
            'X-Title': 'NIRMAAN Personal OS',
          },
          body: JSON.stringify({
            model: embModel,
            input: text,
            encoding_format: 'float',
          }),
        })

        if (res.ok) {
          const data = await res.json()
          return NextResponse.json({ embedding: data.data?.[0]?.embedding, model: embModel })
        }
      } catch {}
    }

    return NextResponse.json({ error: 'All embedding models failed' }, { status: 500 })
  } catch {
    return NextResponse.json({ error: 'Embedding failed' }, { status: 500 })
  }
}
