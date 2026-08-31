import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://mfzulmibfmktllnshxox.supabase.co'
const VALID_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

function getAnonKey() {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (envKey && envKey.includes('mfzulmibfmktllnshxox')) return envKey
  return VALID_ANON_KEY
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
  return createClient(url, getAnonKey())
}

// Extract User ID from Authorization Bearer Token (validated against DB)
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


export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await req.json()
    const userId = await getUserIdFromRequest(req)

    // Require valid token for all MCP operations
    if (!userId) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: body?.id || null, error: { code: -32001, message: 'Unauthorized: valid Bearer token required' } },
        { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="NIRMAAN MCP"' } }
      )
    }

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

function getMcpOrigin(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'me-eight-dun.vercel.app'
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  const userId = await getUserIdFromRequest(req)
  const action = req.nextUrl.searchParams.get('action')

  // RFC 9728: When no action and not authenticated, return 401 with PRM discovery header
  // This is how ChatGPT MCP connector discovers the authorization server
  if (!action) {
    const origin = getMcpOrigin(req)
    const prmUrl = `${origin}/api/mcp/.well-known/oauth-protected-resource`
    const authServerUrl = `${origin}/api/mcp/.well-known/oauth-authorization-server`

    if (!userId) {
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
            // RFC 9728 WWW-Authenticate with resource_metadata pointer
            'WWW-Authenticate': `Bearer realm="NIRMAAN MCP", resource_metadata="${prmUrl}"`,
          },
        }
      )
    }

    // Authenticated: return server info
    return NextResponse.json({
      status: 'online',
      server: 'NIRMAAN MCP Protocol Gateway',
      version: '1.0.0',
      supported_clients: ['ChatGPT', 'Claude Desktop', 'Cursor', 'Windsurf'],
      endpoints: {
        mcp_jsonrpc: `${origin}/api/mcp`,
        openapi_spec: `${origin}/api/mcp/openapi.json`,
        oauth_metadata: authServerUrl,
        protected_resource_metadata: prmUrl,
      }
    })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}


