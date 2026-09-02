import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TODOIST_BASE_URL = 'https://api.todoist.com/rest/v2'
const FALLBACK_TOKEN = process.env.TODOIST_API_TOKEN ?? ''

// Get per-user Todoist token from DB, fallback to env
async function getTodoistToken(userId?: string): Promise<string> {
  if (!userId) return FALLBACK_TOKEN

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('api_keys')
      .select('key_hash')
      .eq('user_id', userId)
      .eq('name', 'todoist_token')
      .single()

    return data?.key_hash ?? FALLBACK_TOKEN
  } catch {
    return FALLBACK_TOKEN
  }
}

function getHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

// GET /api/todoist — fetch active tasks for user
export async function GET(req: NextRequest) {
  const userId = req.headers.get('X-User-Id') ?? undefined
  const token = await getTodoistToken(userId)

  if (!token) {
    return NextResponse.json({ error: 'No Todoist API token configured. Add one in Settings.' }, { status: 401 })
  }

  try {
    const res = await fetch(`${TODOIST_BASE_URL}/tasks`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Todoist API Error: ${errText}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, tasks: data, connected: true })
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${String(err)}` }, { status: 500 })
  }
}

// POST /api/todoist — create, update, close, reopen, delete tasks
export async function POST(req: NextRequest) {
  const userId = req.headers.get('X-User-Id') ?? undefined
  const token = await getTodoistToken(userId)

  if (!token) {
    return NextResponse.json({ error: 'No Todoist token. Add token in Settings → Integrations.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, taskId, content, description, dueDate, dueTime, priority, test } = body

    // Test connection
    if (test) {
      const res = await fetch(`${TODOIST_BASE_URL}/tasks?limit=1`, {
        method: 'GET',
        headers: getHeaders(token),
        cache: 'no-store',
      })
      return NextResponse.json({ success: res.ok, connected: res.ok, status: res.status })
    }

    if (action === 'close') {
      const res = await fetch(`${TODOIST_BASE_URL}/tasks/${taskId}/close`, {
        method: 'POST',
        headers: getHeaders(token),
      })
      return NextResponse.json({ success: res.ok })
    }

    if (action === 'reopen') {
      const res = await fetch(`${TODOIST_BASE_URL}/tasks/${taskId}/reopen`, {
        method: 'POST',
        headers: getHeaders(token),
      })
      return NextResponse.json({ success: res.ok })
    }

    if (action === 'delete') {
      const res = await fetch(`${TODOIST_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      })
      return NextResponse.json({ success: res.ok })
    }

    if (action === 'update' && taskId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {}
      if (content) payload.content = content.trim()
      if (description !== undefined) payload.description = description
      if (priority) payload.priority = priority
      if (dueDate) {
        payload.due_date = dueDate
        if (dueTime) payload.due_datetime = `${dueDate}T${dueTime}:00`
      }
      const res = await fetch(`${TODOIST_BASE_URL}/tasks/${taskId}`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errText = await res.text()
        return NextResponse.json({ error: `Update failed: ${errText}` }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ success: true, task: data })
    }

    // Default: Create task
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      content: content ? content.trim() : 'New Helpo Task',
      priority: priority || 1,
    }

    if (description) payload.description = description.trim()
    if (dueDate) {
      if (dueTime) {
        payload.due_datetime = `${dueDate}T${dueTime}`
      } else {
        payload.due_date = dueDate
      }
    }

    const res = await fetch(`${TODOIST_BASE_URL}/tasks`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Failed to create: ${errText}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, task: data })
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${String(err)}` }, { status: 500 })
  }
}
