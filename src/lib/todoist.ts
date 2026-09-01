// Official Todoist REST API Integration Client via Server-Side Proxy

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

/**
 * Fetch all active tasks from Todoist via server-side proxy
 */
export async function getTodoistTasks(): Promise<TodoistTask[]> {
  try {
    const res = await fetch('/api/todoist', {
      method: 'GET',
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.tasks || []
  } catch (err) {
    console.error('Failed to fetch Todoist tasks:', err)
    return []
  }
}

/**
 * Create a new task in Todoist via server-side proxy
 */
export async function createTodoistTask(
  content: string,
  description?: string,
  dueDate?: string,
  dueTime?: string,
  priority: number = 1
): Promise<TodoistTask | null> {
  try {
    const res = await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        content,
        description,
        dueDate,
        dueTime,
        priority,
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    return data.task || null
  } catch (err) {
    console.error('Failed to create Todoist task:', err)
    return null
  }
}

/**
 * Close / Mark Complete a task in Todoist via server-side proxy
 */
export async function closeTodoistTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', taskId }),
    })
    const data = await res.json()
    return data.success
  } catch (err) {
    console.error('Failed to close Todoist task:', err)
    return false
  }
}

/**
 * Reopen a completed task in Todoist via server-side proxy
 */
export async function reopenTodoistTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reopen', taskId }),
    })
    const data = await res.json()
    return data.success
  } catch (err) {
    console.error('Failed to reopen Todoist task:', err)
    return false
  }
}

/**
 * Delete a task in Todoist via server-side proxy
 */
export async function deleteTodoistTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', taskId }),
    })
    const data = await res.json()
    return data.success
  } catch (err) {
    console.error('Failed to delete Todoist task:', err)
    return false
  }
}
