// Official Todoist REST API v2 Integration Module
const TODOIST_API_TOKEN = 'a6e352d5b0f5d60530c9841b91a07bb760f2d910'
const TODOIST_BASE_URL = 'https://api.todoist.com/rest/v2'

export interface TodoistTask {
  id: string
  content: string
  description?: string
  is_completed: boolean
  priority: number // 1 = Normal/p4, 4 = Urgent/p1 in Todoist API
  due?: {
    date: string
    string?: string
    datetime?: string
  }
  created_at: string
  url: string
}

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${TODOIST_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Fetch all active tasks from Todoist
 */
export async function getTodoistTasks(): Promise<TodoistTask[]> {
  try {
    const res = await fetch(`${TODOIST_BASE_URL}/tasks`, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) return []
    return await res.json()
  } catch (err) {
    console.error('Failed to fetch Todoist tasks:', err)
    return []
  }
}

/**
 * Create a new task in Todoist
 */
export async function createTodoistTask(
  content: string,
  description?: string,
  dueDate?: string,
  dueTime?: string,
  priority: number = 1
): Promise<TodoistTask | null> {
  try {
    // Map NIRMAAN priority (4=P1, 1=P4) to Todoist priority (4=p1, 1=p4)
    let todoistPriority = priority
    if (priority === 4) todoistPriority = 4
    else if (priority === 3) todoistPriority = 3
    else if (priority === 2) todoistPriority = 2
    else todoistPriority = 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      content: content.trim(),
      priority: todoistPriority,
    }

    if (description && description.trim()) {
      payload.description = description.trim()
    }

    if (dueDate) {
      if (dueTime) {
        payload.due_datetime = `${dueDate}T${dueTime}:00Z`
      } else {
        payload.due_date = dueDate
      }
    }

    const res = await fetch(`${TODOIST_BASE_URL}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Todoist task creation error:', errText)
      return null
    }
    return await res.json()
  } catch (err) {
    console.error('Failed to create Todoist task:', err)
    return null
  }
}

/**
 * Close / Mark Complete a task in Todoist
 */
export async function closeTodoistTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`${TODOIST_BASE_URL}/tasks/${taskId}/close`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })
    return res.ok
  } catch (err) {
    console.error('Failed to close Todoist task:', err)
    return false
  }
}

/**
 * Reopen a completed task in Todoist
 */
export async function reopenTodoistTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`${TODOIST_BASE_URL}/tasks/${taskId}/reopen`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })
    return res.ok
  } catch (err) {
    console.error('Failed to reopen Todoist task:', err)
    return false
  }
}

/**
 * Delete a task in Todoist
 */
export async function deleteTodoistTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`${TODOIST_BASE_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    return res.ok
  } catch (err) {
    console.error('Failed to delete Todoist task:', err)
    return false
  }
}
