import { NextRequest, NextResponse } from 'next/server'

const TODOIST_API_TOKEN = 'a6e352d5b0f5d60530c9841b91a07bb760f2d910'
const TODOIST_BASE_URL = 'https://api.todoist.com/rest/v2'

function getHeaders() {
  return {
    'Authorization': `Bearer ${TODOIST_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

// GET /api/todoist - Fetch all active Todoist tasks server-side
export async function GET() {
  try {
    const res = await fetch(`${TODOIST_BASE_URL}/tasks`, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Todoist API Error: ${errText}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, tasks: data })
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${String(err)}` }, { status: 500 })
  }
}

// POST /api/todoist - Create, close, reopen, or delete Todoist tasks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, taskId, content, description, dueDate, dueTime, priority } = body

    if (action === 'close') {
      const res = await fetch(`${TODOIST_BASE_URL}/tasks/${taskId}/close`, {
        method: 'POST',
        headers: getHeaders(),
      })
      return NextResponse.json({ success: res.ok })
    }

    if (action === 'reopen') {
      const res = await fetch(`${TODOIST_BASE_URL}/tasks/${taskId}/reopen`, {
        method: 'POST',
        headers: getHeaders(),
      })
      return NextResponse.json({ success: res.ok })
    }

    if (action === 'delete') {
      const res = await fetch(`${TODOIST_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })
      return NextResponse.json({ success: res.ok })
    }

    // Default: Create task
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      content: content ? content.trim() : 'New NIRMAAN Task',
      priority: priority || 1,
    }

    if (description) payload.description = description.trim()
    if (dueDate) {
      if (dueTime) {
        payload.due_datetime = `${dueDate}T${dueTime}:00Z`
      } else {
        payload.due_date = dueDate
      }
    }

    const res = await fetch(`${TODOIST_BASE_URL}/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Failed to create task: ${errText}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, task: data })
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${String(err)}` }, { status: 500 })
  }
}
