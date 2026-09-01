'use client'

import { useEffect, useState, useCallback } from 'react'
import AppShell from '@/components/layout/AppShell'
import {
  CheckCircle2, Plus, RefreshCw, Trash2, Calendar, Clock,
  Sparkles, ExternalLink, Bot, Send, ShieldCheck, Check
} from 'lucide-react'
import { toast } from 'sonner'
import FormattedAIResponse from '@/components/common/FormattedAIResponse'
import { getTodoistTasks, createTodoistTask, closeTodoistTask, reopenTodoistTask, deleteTodoistTask, TodoistTask } from '@/lib/todoist'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

export default function TodoistPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [todoistTasks, setTodoistTasks] = useState<TodoistTask[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // New Task Form State
  const [content, setContent] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<number>(4) // 4 = p1 in Todoist
  const [creating, setCreating] = useState(false)

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTodoistTasks()
      setTodoistTasks(data)
    } catch {
      toast.error('Failed to load Todoist tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setCreating(true)

    const newTask = await createTodoistTask(content.trim(), description, dueDate, dueTime, priority)
    if (newTask) {
      toast.success('Task created & synced with Todoist! 📝')
      setContent('')
      setDescription('')
      setDueDate('')
      setDueTime('')

      // Also sync to NIRMAAN database if user is logged in
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('tasks') as any).insert({
          user_id: user.id,
          title: content.trim(),
          description: description || null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          due_time: dueTime || null,
          priority,
          status: 'todo',
        })
      }

      fetchTasks()
    } else {
      toast.error('Failed to create task on Todoist')
    }
    setCreating(false)
  }

  async function handleToggleClose(task: TodoistTask) {
    if (task.is_completed) {
      const ok = await reopenTodoistTask(task.id)
      if (ok) {
        toast.success('Task reopened on Todoist ↩️')
        fetchTasks()
      }
    } else {
      const ok = await closeTodoistTask(task.id)
      if (ok) {
        toast.success('Task completed on Todoist! 🏆')
        fetchTasks()
      }
    }
  }

  async function handleDelete(taskId: string) {
    const ok = await deleteTodoistTask(taskId)
    if (ok) {
      toast.success('Task deleted from Todoist')
      setTodoistTasks(prev => prev.filter(t => t.id !== taskId))
    } else {
      toast.error('Failed to delete task')
    }
  }

  async function handleSyncAllToNirmaan() {
    if (!user) {
      toast.error('Please log in to sync Todoist entries to NIRMAAN')
      return
    }
    setSyncing(true)
    try {
      let insertedCount = 0
      for (const t of todoistTasks) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('tasks') as any).insert({
          user_id: user.id,
          title: t.content,
          description: t.description || null,
          priority: t.priority === 4 ? 4 : t.priority === 3 ? 3 : 2,
          due_date: t.due?.date ? new Date(t.due.date).toISOString() : null,
          status: t.is_completed ? 'done' : 'todo',
        })
        if (!error) insertedCount++
      }
      toast.success(`Synced ${insertedCount} task(s) into NIRMAAN workspace! ⚡`)
    } catch {
      toast.error('Failed to sync tasks')
    } finally {
      setSyncing(false)
    }
  }

  async function handleAISubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!aiPrompt.trim() || !user) return
    setAiLoading(true)
    const promptText = aiPrompt.trim()
    setAiPrompt('')

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Manage Todoist tasks: ${promptText}`,
            },
          ],
          model: 'x-ai/grok-2-1212',
          enableTools: true,
          grokApiKey: customGrokKey,
        }),
      })

      if (res.ok) {
        const text = await res.text()
        if (text) {
          const lines = text.split('\n').filter(l => l.startsWith('data: ')).map(l => l.replace('data: ', ''))
          let fullOutput = ''
          for (const line of lines) {
            if (line === '[DONE]') continue
            try {
              const parsed = JSON.parse(line)
              const chunk = parsed.choices?.[0]?.delta?.content || ''
              fullOutput += chunk
            } catch {}
          }
          if (fullOutput.trim()) {
            setAiResponse(fullOutput.trim())
            fetchTasks()
          }
        }
      }
    } catch {
      toast.error('AI execution failed')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #E44332 0%, #FF6B5B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(228, 67, 50, 0.4)',
            }}>
              <CheckCircle2 size={20} color="#FFFFFF" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                Todoist Live Workspace <ShieldCheck size={16} color="#10B981" />
              </h1>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Official Todoist API Integration with Real-Time Auto-Sync</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSyncAllToNirmaan}
              disabled={syncing}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: 12.5 }}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Sync to NIRMAAN
            </button>
            <a
              href="https://todoist.com/app"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: 12.5, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ExternalLink size={14} /> Open Todoist.com
            </a>
          </div>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* AI Todoist Assistant Command Card */}
        <div style={{
          background: 'linear-gradient(135deg, #121318 0%, #1A1C24 100%)',
          border: '1px solid #E44332',
          borderRadius: 20,
          padding: '18px 20px',
          boxShadow: '0 12px 36px rgba(228, 67, 50, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #E44332, #FF6B5B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
              <Bot size={18} color="#FFFFFF" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                AI Todoist Optimizer <Sparkles size={14} color="#FF6B5B" />
              </h3>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>Create, prioritize, or organize Todoist tasks using AI</span>
            </div>
          </div>

          <form onSubmit={handleAISubmit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="e.g. 'Create a Todoist task to review weekly metrics at 4pm', 'Organize my Todoist list'..."
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              style={{
                flex: 1,
                height: 44,
                background: '#0A0B0D',
                border: '1px solid rgba(228, 67, 50, 0.4)',
                borderRadius: 12,
                color: '#FFFFFF',
                fontSize: 13,
                padding: '0 14px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="btn btn-primary"
              style={{ height: 44, padding: '0 18px', fontSize: 13, background: 'linear-gradient(135deg, #E44332, #FF6B5B)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {aiLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              <span>{aiLoading ? 'Processing...' : 'Send AI'}</span>
            </button>
          </form>

          {aiResponse && (
            <div style={{ background: '#0A0B0D', border: '1px solid rgba(228, 67, 50, 0.3)', padding: 14, borderRadius: 12 }}>
              <FormattedAIResponse content={aiResponse} />
            </div>
          )}
        </div>

        {/* Create Todoist Task Form */}
        <div style={{
          background: '#0A0B0D',
          border: '1px solid rgba(228, 67, 50, 0.35)',
          borderRadius: 20,
          padding: 22,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} color="#E44332" /> Add New Todoist Entry
          </h3>

          <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="text"
              placeholder="Task content (e.g. Prepare presentation slides)..."
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              style={{
                height: 44,
                background: '#121318',
                border: '1px solid rgba(228, 67, 50, 0.3)',
                borderRadius: 12,
                color: '#FFFFFF',
                fontSize: 14,
                padding: '0 14px',
                outline: 'none',
              }}
            />

            <input
              type="text"
              placeholder="Description / Notes (optional)..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{
                height: 40,
                background: '#121318',
                border: '1px solid rgba(228, 67, 50, 0.3)',
                borderRadius: 12,
                color: '#FFFFFF',
                fontSize: 13,
                padding: '0 14px',
                outline: 'none',
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', marginBottom: 4, display: 'block' }}>DUE DATE</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{ width: '100%', height: 40, background: '#121318', border: '1px solid rgba(228, 67, 50, 0.3)', borderRadius: 10, color: '#FFFFFF', fontSize: 12, padding: '0 10px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', marginBottom: 4, display: 'block' }}>DUE TIME</label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={e => setDueTime(e.target.value)}
                  style={{ width: '100%', height: 40, background: '#121318', border: '1px solid rgba(228, 67, 50, 0.3)', borderRadius: 10, color: '#FFFFFF', fontSize: 12, padding: '0 10px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', marginBottom: 4, display: 'block' }}>PRIORITY</label>
                <select
                  value={priority}
                  onChange={e => setPriority(Number(e.target.value))}
                  style={{ width: '100%', height: 40, background: '#121318', border: '1px solid rgba(228, 67, 50, 0.3)', borderRadius: 10, color: '#FFFFFF', fontSize: 12, padding: '0 10px', outline: 'none' }}
                >
                  <option value={4}>P1 — Urgent (Red)</option>
                  <option value={3}>P2 — High (Orange)</option>
                  <option value={2}>P3 — Medium (Blue)</option>
                  <option value={1}>P4 — Normal (Gray)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="btn btn-primary"
              style={{ height: 44, fontSize: 14, background: 'linear-gradient(135deg, #E44332, #FF6B5B)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {creating ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>{creating ? 'Syncing to Todoist...' : 'Add Task to Todoist'}</span>
            </button>
          </form>
        </div>

        {/* Live Todoist Entries List */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              Live Todoist Tasks ({todoistTasks.length})
            </h3>
            <button
              onClick={fetchTasks}
              className="btn btn-ghost btn-icon"
              title="Refresh Todoist Tasks"
              style={{ border: '1px solid rgba(228, 67, 50, 0.3)', width: 36, height: 36 }}
            >
              <RefreshCw size={16} color="#E44332" className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
              <RefreshCw size={32} color="#E44332" className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Connecting to Todoist REST API v2...</p>
            </div>
          ) : todoistTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#0A0B0D', borderRadius: 20, border: '1px solid rgba(228, 67, 50, 0.25)' }}>
              <CheckCircle2 size={40} color="#E44332" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>No active tasks found in Todoist</h4>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Create a task above or use AI to generate new Todoist entries.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todoistTasks.map(task => {
                const pColor = task.priority === 4 ? '#EF4444' : task.priority === 3 ? '#F59E0B' : task.priority === 2 ? '#3B82F6' : '#9CA3AF'
                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      background: '#121318',
                      border: `1px solid ${task.is_completed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(228, 67, 50, 0.25)'}`,
                      borderRadius: 16,
                      gap: 14,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                      <button
                        onClick={() => handleToggleClose(task)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          border: `2px solid ${task.is_completed ? '#10B981' : pColor}`,
                          background: task.is_completed ? '#10B981' : 'none',
                          color: '#000000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title={task.is_completed ? 'Reopen task' : 'Mark done'}
                      >
                        {task.is_completed && <Check size={14} color="#000000" />}
                      </button>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: task.is_completed ? '#9CA3AF' : '#FFFFFF',
                          textDecoration: task.is_completed ? 'line-through' : 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {task.content}
                        </div>
                        {task.description && (
                          <div style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      {task.due?.date && (
                        <span style={{ fontSize: 11.5, color: '#FF6B5B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={13} /> {task.due.date}
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: `${pColor}20`,
                          color: pColor,
                          border: `1px solid ${pColor}50`,
                        }}
                      >
                        P{5 - task.priority}
                      </span>

                      <button
                        onClick={() => handleDelete(task.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}
                        title="Delete Todoist Task"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  )
}
