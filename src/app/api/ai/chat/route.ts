import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Free models in order of capability/preference
const FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'deepseek/deepseek-r1:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'openchat/openchat-7b:free',
]

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
      description: 'Get open tasks and todos to help plan the user\'s day',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]

async function executeTool(toolName: string, args: Record<string, unknown>, supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  switch (toolName) {
    case 'create_task': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('tasks') as any).insert({
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
      const { data } = await (supabase.from('todos') as any).insert({
        user_id: userId,
        title: args.title as string,
        due_date: (args.due_date as string) || null,
      }).select().single()
      return { success: true, message: `Todo "${args.title}" added!`, todo: data }
    }
    case 'create_journal_entry': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('journal_entries') as any).insert({
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
      const { data } = await (supabase.from('goals') as any).insert({
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
      const [tasks, todos, streaks, profile] = await Promise.all([
        supabase.from('tasks').select('id, title, status, priority').eq('user_id', userId).neq('status', 'done').limit(10),
        supabase.from('todos').select('id, title').eq('user_id', userId).eq('is_done', false).limit(10),
        supabase.from('streaks').select('*').eq('user_id', userId),
        supabase.from('profiles').select('life_score, current_streak').eq('id', userId).single(),
      ])
      const profileObj = profile.data as { life_score?: number; current_streak?: number } | null
      return {
        open_tasks: tasks.data ?? [],
        open_todos: todos.data ?? [],
        streaks: streaks.data ?? [],
        life_score: profileObj?.life_score ?? 0,
        current_streak: profileObj?.current_streak ?? 0,
      }
    }
    case 'plan_my_day': {
      const [tasks, todos, goals] = await Promise.all([
        supabase.from('tasks').select('id, title, priority, due_date, status').eq('user_id', userId).neq('status', 'done').order('priority', { ascending: false }).limit(10),
        supabase.from('todos').select('id, title, due_date').eq('user_id', userId).eq('is_done', false).limit(10),
        supabase.from('goals').select('id, title, status').eq('user_id', userId).eq('status', 'active').limit(5),
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
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'NIRMAAN Personal OS',
    },
    body: JSON.stringify(body),
  })
}

const HARDCODED_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || 'sk-or-v1-fallback'

export async function POST(req: NextRequest) {
  try {
    const { messages, model, enableTools = true } = await req.json()
    const supabase = await createClient()
    
    // Resolve user ID
    let userId: string | null = null
    const { data: authData } = await supabase.auth.getUser()
    if (authData?.user) {
      userId = authData.user.id
    } else {
      // Fallback for direct DB session
      const { data: firstProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle()
      const prof = firstProfile as { id: string } | null
      userId = prof?.id || 'c9d3517e-542b-4cf4-9bce-ebda2502252f'
    }

    const apiKey = process.env.OPENROUTER_API_KEY || HARDCODED_OPENROUTER_KEY

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

    // Try primary model, then fallbacks
    let targetModel = model
    const isFreeRequest = !model || FREE_MODELS.includes(model)
    const modelFallbacks = isFreeRequest
      ? [model, ...FREE_MODELS.filter(m => m !== model)]
      : [model, FREE_MODELS[0], FREE_MODELS[1]]

    // For tool calling, we need a non-streaming request first
    if (enableTools) {
      let toolResponse = null
      for (const fallbackModel of modelFallbacks.filter(Boolean)) {
        try {
          const res = await callOpenRouter(apiKey, fallbackModel, allMessages, tools, false)
          if (res.ok) {
            toolResponse = await res.json()
            targetModel = fallbackModel
            break
          }
        } catch {}
      }

      if (!toolResponse) {
        return NextResponse.json({ error: 'All models failed' }, { status: 500 })
      }

      const choice = toolResponse.choices?.[0]

      // Handle tool calls
      if (choice?.finish_reason === 'tool_calls' && choice?.message?.tool_calls) {
        const toolCalls = choice.message.tool_calls
        const toolResults = []

        for (const toolCall of toolCalls) {
          const args = JSON.parse(toolCall.function.arguments || '{}')
          const result = await executeTool(toolCall.function.name, args, supabase, userId!)
          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          })
        }

        // Get final response after tool execution
        const finalMessages = [
          ...allMessages,
          choice.message,
          ...toolResults,
        ]

        // Stream the final response
        const streamRes = await callOpenRouter(apiKey, targetModel, finalMessages, undefined, true)
        if (!streamRes.ok) {
          const errText = await streamRes.text()
          return NextResponse.json({ error: errText }, { status: streamRes.status })
        }

        // Inject action events at the start of the stream
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

      // Convert to streaming format for client consistency
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
    for (const fallbackModel of modelFallbacks.filter(Boolean)) {
      try {
        const res = await callOpenRouter(apiKey, fallbackModel, allMessages, undefined, true)
        if (res.ok) { streamResponse = res; break }
      } catch {}
    }

    if (!streamResponse) {
      return NextResponse.json({ error: 'All models failed' }, { status: 500 })
    }

    return new NextResponse(streamResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Embeddings endpoint
export async function PUT(req: NextRequest) {
  try {
    const { text } = await req.json()
    const apiKey = process.env.OPENROUTER_API_KEY || HARDCODED_OPENROUTER_KEY

    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'liquid/lfm-2.5-embedding-350m:free',
        input: text,
        encoding_format: 'float',
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ embedding: data.data?.[0]?.embedding })
  } catch {
    return NextResponse.json({ error: 'Embedding failed' }, { status: 500 })
  }
}
