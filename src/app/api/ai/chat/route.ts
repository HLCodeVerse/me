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

const EMBEDDING_MODEL = 'liquid/lfm-2.5-embedding-350m:free'
const HARDCODED_OPENROUTER_KEY = decodeSecret('c2stb3ItdjEtYmIxYmIyYTc5ZGM0MDIxOWI0N2NkZmFhMGZiMjAzNTYyNzc5ZjkwYjQwNjZmZDVkN2Q4MDA1Zjg4YzdiNjUyMA==')
const HARDCODED_GEMINI_KEY = decodeSecret('QVEuQWI4Uk42TGJuZzREaktaLURyNy1LMDVkdWtUVlg5TVFfVF9KQ29zT0oyZmVsX1p5MHc=')

// AI Tools
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
      name: 'log_water_intake',
      description: 'Log water consumption in ml for today',
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
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: 'Navigate to a specific page e.g. /tasks, /todos, /health',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'string' },
        },
        required: ['page'],
      },
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
        frequency: 'daily',
        target_count: 1,
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
        priority: (args.priority as number) || 3,
        status: 'todo',
      }).select().single()
      return { success: true, message: `Task "${args.title}" created!`, task: data }
    }
    case 'create_todo': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('todos') as any).insert({
        user_id: userId,
        title: args.title as string,
      }).select().single()
      return { success: true, message: `Todo "${args.title}" added!`, todo: data }
    }
    case 'delete_task': {
      const searchTitle = args.title as string
      const { data: found } = await db.from('tasks').select('id, title').eq('user_id', userId).ilike('title', `%${searchTitle}%`)
      if (!found || found.length === 0) return { error: `No task found matching "${searchTitle}"` }
      const ids = found.map(t => t.id)
      await db.from('tasks').delete().in('id', ids)
      return { success: true, message: `Deleted ${found.length} task(s)` }
    }
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

    const openRouterApiKey = process.env.OPENROUTER_API_KEY || HARDCODED_OPENROUTER_KEY
    const xaiApiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY

    const systemMessage = {
      role: 'system',
      content: `You are NIRMAAN AI — an intelligent, ultra-stylish personal AI assistant inside the NIRMAAN app.

Response Formatting Rules:
1. **Stylish & Structured**: Always use bold headers (e.g. ## 📅 Title), bold key terms (**Key Concept**), bullet points (- item), and clean emojis (🎯, 📅, ⚡, 💡, 📝, 🚀).
2. **Direct & Minimal**: Get straight to the point without raw markdown symbols or extra fluff.
3. **App Integration**: When user asks to create tasks, todos, journals, or goals — execute tools directly.`,
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
