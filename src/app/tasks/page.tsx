'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  Plus, LayoutList, Columns, ChevronDown, ChevronRight,
  Circle, CheckCircle2, Loader2, X, Repeat, Sparkles, Brain, Trash2, ListChecks, Send, Flag, Search, CornerDownRight
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, stripMarkdown } from '@/lib/utils'
import type { Task } from '@/lib/supabase/database.types'

type ViewMode = 'list' | 'kanban'
type FilterStatus = 'all' | 'today' | 'p1' | 'todo' | 'in_progress' | 'done'

const STATUSES = ['todo', 'in_progress', 'done']
const STATUS_LABELS: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const STATUS_COLORS: Record<string, string> = { todo: 'var(--text-muted)', in_progress: '#3B82F6', done: '#10B981' }

const PRIORITY_FLAGS: Record<number, { label: string; badgeClass: string; color: string }> = {
  4: { label: 'P1 Urgent', badgeClass: 'badge-p1', color: '#F43F5E' },
  3: { label: 'P2 High', badgeClass: 'badge-p2', color: '#F59E0B' },
  2: { label: 'P3 Medium', badgeClass: 'badge-p3', color: '#7C3AED' },
  1: { label: 'P4 Low', badgeClass: 'badge-p4', color: '#64748B' },
}

export default function TasksPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('list')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [optimizing, setOptimizing] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  // New task form
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState(3)
  const [newDueDate, setNewDueDate] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
      setTasks(data ?? [])
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !user) return
    setSaving(true)
    const cleanTitleText = stripMarkdown(newTitle.trim())
    const cleanDescText = stripMarkdown(newDesc.trim())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('tasks') as any).insert({
      user_id: user.id,
      title: cleanTitleText,
      description: cleanDescText || null,
      priority: newPriority,
      due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
      status: 'todo',
    })
    if (error) { toast.error('Failed to add task'); setSaving(false); return }
    toast.success('Task added!')
    setNewTitle(''); setNewDesc(''); setNewDueDate(''); setNewPriority(3)
    setShowAddForm(false)
    setSaving(false)
    fetchTasks()
  }

  async function handleAITaskGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const promptToUse = aiPrompt.trim() || 'Create 3 focus tasks for my day'
    setOptimizing(true)
    toast.info('AI is executing your prompt...')

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: promptToUse }],
          enableTools: true,
          userId: user.id,
          grokApiKey: customGrokKey,
        })
      })

      if (!res.ok) throw new Error('AI task generation failed')

      const actionsHeader = res.headers.get('X-Actions')
      if (actionsHeader) {
        toast.success(`AI Executed Actions: ${actionsHeader}`, { icon: '⚡' })
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let generatedText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content ?? ''
              if (delta) generatedText += delta
            } catch {}
          }
        }
      }

      const taskTitles = generatedText.split('\n').map(s => stripMarkdown(s)).filter(s => s.length > 2)
      for (const t of taskTitles.slice(0, 3)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('tasks') as any).insert({
          user_id: user.id,
          title: t,
          priority: 3,
          status: 'todo'
        })
      }

      setAiPrompt('')
      toast.success('AI Task(s) synchronized!')
      fetchTasks()
    } catch {
      toast.error('AI task generation failed')
    } finally {
      setOptimizing(false)
    }
  }

  async function updateStatus(taskId: string, status: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
    if (status === 'done') toast.success('Task completed!')
  }

  async function deleteTask(taskId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    toast.success('Task deleted')
  }

  // Filter root tasks
  const rootTasks = tasks.filter(t => !t.parent_task_id)

  const filteredTasks = rootTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (filter === 'p1') return task.priority === 4
    if (filter === 'today') {
      if (!task.due_date) return false
      const todayIso = new Date().toISOString().split('T')[0]
      return task.due_date.startsWith(todayIso)
    }
    if (filter === 'todo' || filter === 'in_progress' || filter === 'done') {
      return task.status === filter
    }
    return true
  })

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ListChecks size={20} color="#7C3AED" />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Tasks & Focus</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setView(v => v === 'list' ? 'kanban' : 'list')}
              className="btn btn-secondary"
              style={{ width: 36, height: 36, padding: 0 }}
              title="Toggle View Mode"
            >
              {view === 'list' ? <Columns size={16} /> : <LayoutList size={16} />}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              <Plus size={15} /> Add Task
            </button>
          </div>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* AI Custom Prompt Bar */}
        <form onSubmit={handleAITaskGenerate} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
          <Sparkles size={18} color="#7C3AED" style={{ flexShrink: 0 }} />
          <input
            className="glow-input"
            placeholder="Tell AI to generate tasks (e.g., 'Break down my landing page build into subtasks')..."
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, fontSize: 13 }}
          />
          <button
            type="submit"
            disabled={optimizing}
            className="btn btn-primary"
            style={{ height: 34, padding: '0 12px', fontSize: 12, flexShrink: 0 }}
          >
            {optimizing ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> AI Generate</>}
          </button>
        </form>

        {/* Search Bar & Filter Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="glow-input"
              placeholder="Quick search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 38, fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {(['all', 'today', 'p1', 'todo', 'in_progress', 'done'] as FilterStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'capitalize',
                  background: filter === f ? '#7C3AED' : 'var(--surface-2)',
                  color: filter === f ? '#FFFFFF' : 'var(--text-secondary)',
                  transition: 'all 150ms ease', flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {f === 'p1' && <Flag size={12} color={filter === f ? '#FFFFFF' : '#F43F5E'} />}
                {f === 'all' ? 'All Tasks' : f === 'p1' ? 'P1 Urgent' : f === 'today' ? 'Due Today' : STATUS_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* List View */}
        {view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 'var(--radius-card)' }} />)
            ) : filteredTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <ListChecks size={24} color="#7C3AED" />
                </div>
                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>No tasks found</p>
                <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>Click Add Task or use AI prompt bar above.</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const subtasks = tasks.filter(t => t.parent_task_id === task.id)
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    subtasks={subtasks}
                    expanded={expandedTasks.has(task.id)}
                    onToggleExpand={() => setExpandedTasks(prev => {
                      const s = new Set(prev)
                      if (s.has(task.id)) s.delete(task.id); else s.add(task.id)
                      return s
                    })}
                    onStatusChange={updateStatus}
                    onDelete={deleteTask}
                    onSubtaskAdded={fetchTasks}
                  />
                )
              })
            )}
          </div>
        )}

        {/* Kanban View */}
        {view === 'kanban' && (
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16 }}>
            {STATUSES.map(status => {
              const colTasks = filteredTasks.filter(t => t.status === status)
              return (
                <div key={status} style={{ minWidth: 260, flex: 1, background: 'var(--surface-2)', padding: 14, borderRadius: 'var(--radius-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status] }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{STATUS_LABELS[status]}</span>
                    </div>
                    <span className="badge badge-muted">{colTasks.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {colTasks.map(task => (
                      <div key={task.id} className="card" style={{ padding: '12px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px', lineHeight: 1.4 }}>
                          {stripMarkdown(task.title)}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span className={`badge ${PRIORITY_FLAGS[task.priority]?.badgeClass || 'badge-muted'}`} style={{ fontSize: 10 }}>
                            <Flag size={10} /> {PRIORITY_FLAGS[task.priority]?.label}
                          </span>
                          {task.due_date && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(task.due_date)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add Task Modal */}
        {showAddForm && (
          <>
            <div className="overlay" onClick={() => setShowAddForm(false)} />
            <div className="animate-fade-in" style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card) var(--radius-card) 0 0',
              padding: '24px 20px', zIndex: 110,
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
              maxWidth: 768, margin: '0 auto',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>New Task</h3>
                <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="var(--text-secondary)" />
                </button>
              </div>
              <form onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                  className="glow-input"
                  placeholder="Task title (e.g. Build authentication endpoints)..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                  required
                  style={{ fontSize: 15, fontWeight: 500 }}
                />
                <textarea
                  className="glow-input"
                  placeholder="Description (optional)"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={2}
                  style={{ resize: 'none' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>PRIORITY LEVEL</label>
                    <select value={newPriority} onChange={e => setNewPriority(Number(e.target.value))}>
                      <option value={4}>P1 — Urgent (Red)</option>
                      <option value={3}>P2 — High (Orange)</option>
                      <option value={2}>P3 — Medium (Blue)</option>
                      <option value={1}>P4 — Low (Gray)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>DUE DATE</label>
                    <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ height: 44, marginTop: 6, fontSize: 14 }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Add Task</>}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

function TaskCard({ task, subtasks, expanded, onToggleExpand, onStatusChange, onDelete, onSubtaskAdded }: {
  task: Task
  subtasks: Task[]
  expanded: boolean
  onToggleExpand: () => void
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  onSubtaskAdded: () => void
}) {
  const { user } = useAuth()
  const supabase = createClient()
  const isDone = task.status === 'done'
  const priorityInfo = PRIORITY_FLAGS[task.priority] || PRIORITY_FLAGS[3]

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [generatingSubtasks, setGeneratingSubtasks] = useState(false)

  const doneSubtasks = subtasks.filter(s => s.status === 'done').length
  const subtaskProgress = subtasks.length > 0 ? Math.round((doneSubtasks / subtasks.length) * 100) : 0

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubtaskTitle.trim() || !user) return
    setAddingSubtask(true)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('tasks') as any).insert({
        user_id: user.id,
        parent_task_id: task.id,
        title: stripMarkdown(newSubtaskTitle.trim()),
        priority: Math.max(1, task.priority - 1),
        status: 'todo'
      })

      if (error) throw error
      setNewSubtaskTitle('')
      toast.success('Subtask added!')
      onSubtaskAdded()
    } catch {
      toast.error('Failed to add subtask')
    } finally {
      setAddingSubtask(false)
    }
  }

  async function aiBreakdownTask() {
    if (!user) return
    setGeneratingSubtasks(true)
    toast.info('Generating AI subtasks...')
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Break down task "${task.title}" into 3 concrete action steps. Return ONLY plain text action steps separated by line breaks, without bullet symbols or markdown formatting.`
          }],
          enableTools: false
        })
      })

      if (!res.ok) throw new Error('AI breakdown failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let resultText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content ?? ''
              if (delta) resultText += delta
            } catch {}
          }
        }
      }

      const steps = resultText.split('\n').map(s => stripMarkdown(s)).filter(s => s.length > 2)
      for (const step of steps.slice(0, 3)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('tasks') as any).insert({
          user_id: user.id,
          parent_task_id: task.id,
          title: step,
          priority: Math.max(1, task.priority - 1),
          status: 'todo'
        })
      }

      toast.success('Generated subtasks!')
      onSubtaskAdded()
    } catch {
      toast.error('Could not generate subtasks')
    } finally {
      setGeneratingSubtasks(false)
    }
  }

  return (
    <div className="card" style={{
      padding: '14px 16px',
      opacity: isDone ? 0.6 : 1,
      transition: 'opacity 200ms',
      borderLeft: `4px solid ${priorityInfo.color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => onStatusChange(task.id, isDone ? 'todo' : 'done')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
        >
          {isDone
            ? <CheckCircle2 size={20} color="#10B981" className="check-pop" />
            : <Circle size={20} color={priorityInfo.color} strokeWidth={1.5} />
          }
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{
              fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0,
              textDecoration: isDone ? 'line-through' : 'none',
            }}>
              {stripMarkdown(task.title)}
            </p>
            <span className={`badge ${priorityInfo.badgeClass}`} style={{ fontSize: 10 }}>
              <Flag size={10} /> {priorityInfo.label}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {task.due_date && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Due {formatDate(task.due_date)}</span>}
            {task.recurrence_rule && <Repeat size={10} color="#3B82F6" />}
            {subtasks.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                {doneSubtasks}/{subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onToggleExpand}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
        >
          {expanded ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
        </button>
      </div>

      {/* Expanded Subtasks Tree & Controls */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {task.description && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{stripMarkdown(task.description)}</p>
          )}

          {/* Subtask Progress Bar */}
          {subtasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                <span>Subtask Progress</span>
                <span>{subtaskProgress}%</span>
              </div>
              <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${subtaskProgress}%`, height: '100%', background: priorityInfo.color, borderRadius: 99, transition: 'width 300ms ease' }} />
              </div>
            </div>
          )}

          {/* Subtasks Tree List */}
          {subtasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 8 }}>
              {subtasks.map(sub => {
                const subDone = sub.status === 'done'
                return (
                  <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <CornerDownRight size={14} color="var(--text-muted)" />
                    <button
                      onClick={() => onStatusChange(sub.id, subDone ? 'todo' : 'done')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                    >
                      {subDone ? <CheckCircle2 size={16} color="#10B981" /> : <Circle size={16} color="var(--text-muted)" />}
                    </button>
                    <span style={{ fontSize: 13, color: subDone ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: subDone ? 'line-through' : 'none' }}>
                      {stripMarkdown(sub.title)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick Inline Subtask Add Input */}
          <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <CornerDownRight size={14} color="var(--text-muted)" />
            <input
              className="glow-input"
              placeholder="Add subtask..."
              value={newSubtaskTitle}
              onChange={e => setNewSubtaskTitle(e.target.value)}
              style={{ flex: 1, height: 32, fontSize: 12, padding: '0 10px' }}
            />
            <button type="submit" disabled={addingSubtask || !newSubtaskTitle.trim()} className="btn btn-secondary" style={{ height: 32, padding: '0 10px', fontSize: 11 }}>
              {addingSubtask ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Subtask
            </button>
          </form>

          {/* Action Row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <button
              onClick={aiBreakdownTask}
              disabled={generatingSubtasks}
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: '4px 10px', height: 30, border: '1px solid #7C3AED', color: '#7C3AED' }}
            >
              {generatingSubtasks ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
              AI Breakdown
            </button>
            {task.status !== 'in_progress' && task.status !== 'done' && (
              <button onClick={() => onStatusChange(task.id, 'in_progress')} className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px', height: 30 }}>
                Start
              </button>
            )}
            {task.status === 'in_progress' && (
              <button onClick={() => onStatusChange(task.id, 'done')} className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px', height: 30 }}>
                Complete
              </button>
            )}
            <button onClick={() => onDelete(task.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 'var(--radius-sm)', padding: '4px 10px', fontSize: 11, cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
