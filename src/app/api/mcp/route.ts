import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://mfzulmibfmktllnshxox.supabase.co'
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoxoxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY
  return createClient(url, key)
}

// Extract User ID from Authorization Bearer Key or return first profile
async function getUserIdFromRequest(req: NextRequest): Promise<string> {
  const supabase = getSupabase()
  const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key')
  if (authHeader) {
    const rawKey = authHeader.replace('Bearer ', '').trim()
    const prefix = rawKey.slice(0, 12)

    const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey))
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

    const { data: keyRow } = await supabase
      .from('api_keys')
      .select('user_id')
      .eq('key_prefix', prefix)
      .eq('key_hash', hashHex)
      .is('revoked_at', null)
      .single()

    if (keyRow?.user_id) return keyRow.user_id
  }

  // Fallback to first profile if no key provided
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1)
  return profiles?.[0]?.id || 'guest_user'
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await req.json()
    const userId = await getUserIdFromRequest(req)

    // Handle Direct RESTful ChatGPT Actions: Create Task / Todo / Journal
    if (body.action === 'create_task' || (body.title && !body.method && !body.type)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newTask, error } = await (supabase.from('tasks') as any).insert({
        user_id: userId,
        title: body.title,
        priority: body.priority || 3,
        due_date: body.due_date || null,
        status: 'todo'
      }).select().single()

      if (error) throw error
      return NextResponse.json({ success: true, message: `Created task: ${newTask.title}`, task: newTask })
    }

    if (body.action === 'create_journal' || body.content) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newEntry, error } = await (supabase.from('journal_entries') as any).insert({
        user_id: userId,
        content: body.content,
        mood: body.mood || '⚡'
      }).select().single()

      if (error) throw error
      return NextResponse.json({ success: true, message: `Logged journal entry: ${newEntry.content}`, entry: newEntry })
    }

    // Handle MCP JSON-RPC Protocol
    const { id, method, params } = body

    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'NIRMAAN OS MCP Server', version: '1.0.0' }
        }
      })
    }

    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'get_life_dashboard',
              description: 'Retrieve user life score, active tasks, todos, and active streak in NIRMAAN OS.',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'list_tasks',
              description: 'Fetch user tasks from NIRMAAN OS.',
              inputSchema: { type: 'object', properties: { status: { type: 'string', description: 'Filter by todo, in_progress, completed' } } }
            },
            {
              name: 'create_task',
              description: 'Create a new high-priority focus task in NIRMAAN OS.',
              inputSchema: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Task title' },
                  priority: { type: 'number', description: 'Priority 1 (low) to 4 (urgent)' },
                  due_date: { type: 'string', description: 'Due date ISO string' }
                },
                required: ['title']
              }
            },
            {
              name: 'create_todo',
              description: 'Create a daily todo item in NIRMAAN OS.',
              inputSchema: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Todo title' }
                },
                required: ['title']
              }
            },
            {
              name: 'create_journal_entry',
              description: 'Write a micro-journal entry or reflection in NIRMAAN OS.',
              inputSchema: {
                type: 'object',
                properties: {
                  content: { type: 'string', description: 'Journal reflection text' },
                  mood: { type: 'string', description: 'Mood emoji or string (e.g. ⚡, 🔥, 🧘)' }
                },
                required: ['content']
              }
            }
          ]
        }
      })
    }

    if (method === 'tools/call') {
      const toolName = params?.name
      const args = params?.arguments || {}

      if (toolName === 'get_life_dashboard') {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
        const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
        const { data: todos } = await supabase.from('todos').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)

        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                profile: profile || { display_name: 'Builder', life_score: 85, current_streak: 5 },
                recent_tasks: tasks || [],
                recent_todos: todos || []
              }, null, 2)
            }]
          }
        })
      }

      if (toolName === 'list_tasks') {
        let query = supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        if (args.status) query = query.eq('status', args.status)
        const { data: tasks } = await query

        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(tasks || [], null, 2) }]
          }
        })
      }

      if (toolName === 'create_task') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newTask, error } = await (supabase.from('tasks') as any).insert({
          user_id: userId,
          title: args.title,
          priority: args.priority || 3,
          due_date: args.due_date || null,
          status: 'todo'
        }).select().single()

        if (error) throw error

        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Created task: ${newTask.title} (ID: ${newTask.id})` }]
          }
        })
      }

      if (toolName === 'create_todo') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newTodo, error } = await (supabase.from('todos') as any).insert({
          user_id: userId,
          title: args.title,
          completed: false
        }).select().single()

        if (error) throw error

        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Created todo: ${newTodo.title}` }]
          }
        })
      }

      if (toolName === 'create_journal_entry') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newEntry, error } = await (supabase.from('journal_entries') as any).insert({
          user_id: userId,
          content: args.content,
          mood: args.mood || '⚡'
        }).select().single()

        if (error) throw error

        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Logged journal entry (${newEntry.mood}): ${newEntry.content}` }]
          }
        })
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Tool ${toolName} not found` }
      })
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32601, message: `Method ${method} not supported` }
    })
  } catch (err: unknown) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: err instanceof Error ? err.message : 'Internal MCP error' }
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  const userId = await getUserIdFromRequest(req)
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'dashboard') {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
    const { data: todos } = await supabase.from('todos').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
    return NextResponse.json({ profile, tasks, todos })
  }

  if (action === 'tasks') {
    const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    return NextResponse.json(tasks || [])
  }

  return NextResponse.json({
    status: 'online',
    server: 'NIRMAAN MCP Protocol Gateway',
    version: '1.0.0',
    supported_clients: ['Grok', 'ChatGPT', 'Claude Desktop', 'Cursor', 'Windsurf'],
    endpoints: {
      mcp_jsonrpc: '/api/mcp',
      openapi_spec: '/api/mcp/openapi.json'
    }
  })
}
