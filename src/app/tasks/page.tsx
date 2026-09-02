'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  Plus, LayoutList, Columns, ChevronDown, ChevronRight,
  Circle, CheckCircle2, Loader2, X, Sparkles, Trash2, ListChecks, Send, Flag, Search, CornerDownRight,
  Calendar, Clock, HeartPulse, CheckSquare, Zap, BookOpen, Tag
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, stripMarkdown } from '@/lib/utils'
import type { Task } from '@/lib/supabase/database.types'
import { createTodoistTask } from '@/lib/todoist'

type ViewMode = 'list' | 'kanban'
type FilterStatus = 'all' | 'today' | 'p1' | 'todo' | 'in_progress' | 'done'
type CategoryType = 'all' | 'health' | 'todo' | 'habit' | 'journal' | 'other'

const STATUSES = ['todo', 'in_progress', 'done']
const STATUS_LABELS: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const STATUS_COLORS: Record<string, string> = { todo: 'var(--text-muted)', in_progress: '#06B6D4', done: '#10B981' }

const CATEGORIES: { id: CategoryType; label: string; icon: any; color: string }[] = [
  { id: 'all', label: 'All', icon: Tag, color: '#06B6D4' },
  { id: 'todo', label: 'Todo Task', icon: CheckSquare, color: '#06B6D4' },
  { id: 'health', label: 'Health', icon: HeartPulse, color: '#EF4444' },
  { id: 'habit', label: 'Habit', icon: Zap, color: '#10B981' },
  { id: 'journal', label: 'Journal', icon: BookOpen, color: '#06B6D4' },
  { id: 'other', label: 'Other', icon: Tag, color: '#FFFFFF' },
]

const PRIORITY_FLAGS: Record<number, { label: string; badgeClass: string; color: string }> = {
  4: { label: 'P1 Urgent', badgeClass: 'badge-p1', color: '#EF4444' },
  3: { label: 'P2 High', badgeClass: 'badge-p2', color: '#06B6D4' },
  2: { label: 'P3 Medium', badgeClass: 'badge-p3', color: '#10B981' },
  1: { label: 'P4 Low', badgeClass: 'badge-p4', color: '#94A3B8' },
}

export default function TasksPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('list')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [optimizing, setOptimizing] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  // New task form
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<string>('todo')
  const [newPriority, setNewPriority] = useState(3)
  const [newDueDate, setNewDueDate] = useState('')
  const [newDueTime, setNewDueTime] = useState('')
  const [newFrequency, setNewFrequency] = useState('one-time')
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
      category: newCategory,
      description: cleanDescText || null,
      priority: newPriority,
      due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
      due_time: newDueTime || null,
      frequency: newFrequency || 'one-time',
      completed_dates: {},
      status: 'todo',
    })
    if (error) { toast.error('Failed to add item'); setSaving(false); return }
    createTodoistTask(cleanTitleText, cleanDescText, newDueDate, newDueTime, newPriority).catch(() => {})
    toast.success('Task created! 📝')
    setNewTitle(''); setNewDesc(''); setNewDueDate(''); setNewDueTime(''); setNewPriority(3); setNewCategory('todo')
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

      if (!res.ok) throw new Error('AI generation failed')

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
          category: 'todo',
          priority: 3,
          status: 'todo'
        })
      }

      setAiPrompt('')
      toast.success('AI Items created!')
      fetchTasks()
    } catch {
      toast.error('AI generation failed')
    } finally {
      setOptimizing(false)
    }
  }

  async function updateStatus(taskId: string, status: string) {
    const today = new Date().toISOString().split('T')[0]
    const taskToUpdate = tasks.find(t => t.id === taskId)
    const currentCompletedDates: Record<string, boolean> = (taskToUpdate?.completed_dates as Record<string, boolean>) || {}
    const isDone = status === 'done'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).update({
      status,
      completed_at: isDone ? new Date().toISOString() : null,
      completed_dates: { ...currentCompletedDates, [today]: isDone }
    }).eq('id', taskId)

    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      status,
      completed_dates: { ...(t.completed_dates as Record<string, boolean> || {}), [today]: isDone }
    } : t))

    if (isDone) toast.success('Completed! 🎉')
  }

  async function toggleDateCompletion(taskId: string, dateStr: string) {
    const taskToUpdate = tasks.find(t => t.id === taskId)
    if (!taskToUpdate) return
    const currentCompletedDates: Record<string, boolean> = (taskToUpdate.completed_dates as Record<string, boolean>) || {}
    const isCurrentlyDone = !!currentCompletedDates[dateStr]
    const updatedDates = { ...currentCompletedDates, [dateStr]: !isCurrentlyDone }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).update({
      completed_dates: updatedDates,
      completed_at: !isCurrentlyDone ? new Date().toISOString() : taskToUpdate.completed_at
    }).eq('id', taskId)

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed_dates: updatedDates } : t))
    toast.success(`Updated ${dateStr} status!`)
  }

  async function deleteTask(taskId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    toast.success('Deleted')
  }

  // Filter root tasks
  const rootTasks = tasks.filter(t => !t.parent_task_id)

  const filteredTasks = rootTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (categoryFilter !== 'all' && (task.category || 'todo') !== categoryFilter) {
      return false
    }

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
            <ListChecks size={20} color="#06B6D4" />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Tasks & Categories</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setView(v => v === 'list' ? 'kanban' : 'list')}
              className="btn btn-secondary"
              style={{ width: 36, height: 36, padding: 0 }}
              title="Toggle View Mode"
            >
              {view === 'list' ? <Columns size={16} color="#06B6D4" /> : <LayoutList size={16} color="#06B6D4" />}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              <Plus size={15} /> Add Item
            </button>
          </div>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* AI Prompt Bar */}
        <form onSubmit={handleAITaskGenerate} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
          <Sparkles size={18} color="#06B6D4" style={{ flexShrink: 0 }} />
          <input
            className="glow-input"
            placeholder="Ask AI to generate tasks, health goals, or habits..."
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

        {/* Category Pills Bar */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const isActive = categoryFilter === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                style={{
                  padding: '7px 14px', borderRadius: 99, border: '1px solid var(--border)', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  background: isActive ? cat.color : 'var(--surface-2)',
                  color: isActive ? '#000000' : 'var(--text-secondary)',
                  transition: 'all 150ms ease', flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Icon size={14} color={isActive ? '#000000' : cat.color} />
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Search Bar & Filter Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="glow-input"
              placeholder="Search items by title or description..."
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
                  padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'capitalize',
                  background: filter === f ? '#06B6D4' : 'var(--surface-2)',
                  color: filter === f ? '#FFFFFF' : 'var(--text-secondary)',
                  transition: 'all 150ms ease', flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {f === 'p1' && <Flag size={11} color={filter === f ? '#FFFFFF' : '#EF4444'} />}
                {f === 'all' ? 'All Status' : f === 'p1' ? 'P1 Urgent' : f === 'today' ? 'Due Today' : STATUS_LABELS[f]}
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
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <ListChecks size={24} color="#06B6D4" />
                </div>
                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>No items found</p>
                <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>Click Add Item to get started.</p>
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
                    onToggleDateCompletion={toggleDateCompletion}
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
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>New Task / Goal / Habit</h3>
                <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="var(--text-secondary)" />
                </button>
              </div>
              <form onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>TITLE</label>
                  <input
                    className="glow-input"
                    placeholder="Item title (e.g., Morning Run 5km)..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    autoFocus
                    required
                    style={{ fontSize: 15, fontWeight: 500 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>CATEGORY</label>
                    <select value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                      <option value="todo">☑️ Todo Task</option>
                      <option value="health">🏥 Health</option>
                      <option value="habit">⚡ Habit</option>
                      <option value="journal">📝 Journal Task</option>
                      <option value="other">📌 Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>PRIORITY LEVEL</label>
                    <select value={newPriority} onChange={e => setNewPriority(Number(e.target.value))}>
                      <option value={4}>P1 — Urgent (Red)</option>
                      <option value={3}>P2 — High (Cyan)</option>
                      <option value={2}>P3 — Medium (Green)</option>
                      <option value={1}>P4 — Low (Gray)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>DUE DATE *</label>
                    <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>DUE TIME *</label>
                    <input type="time" value={newDueTime} onChange={e => setNewDueTime(e.target.value)} required />
                  </div>
                </div>

                <textarea
                  className="glow-input"
                  placeholder="Description (optional)"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={2}
                  style={{ resize: 'none' }}
                />

                <button type="submit" disabled={saving} className="btn btn-primary" style={{ height: 44, marginTop: 6, fontSize: 14 }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Save Item</>}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

function TaskCard({ task, subtasks, expanded, onToggleExpand, onStatusChange, onToggleDateCompletion, onDelete, onSubtaskAdded }: {
  task: Task
  subtasks: Task[]
  expanded: boolean
  onToggleExpand: () => void
  onStatusChange: (id: string, status: string) => void
  onToggleDateCompletion: (id: string, date: string) => void
  onDelete: (id: string) => void
  onSubtaskAdded: () => void
}) {
  const { user } = useAuth()
  const supabase = createClient()
  const isDone = task.status === 'done'
  const priorityInfo = PRIORITY_FLAGS[task.priority] || PRIORITY_FLAGS[3]

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]
  const completedDates: Record<string, boolean> = (task.completed_dates as Record<string, boolean>) || {}
  const isTodayDone = !!completedDates[todayStr]

  const categoryObj = CATEGORIES.find(c => c.id === (task.category || 'todo')) || CATEGORIES[1]
  const CategoryIcon = categoryObj.icon

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

  return (
    <div className="card" style={{
      padding: '14px 16px',
      opacity: isDone ? 0.65 : 1,
      transition: 'all 200ms',
      borderLeft: `4px solid ${categoryObj.color || priorityInfo.color}`,
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
            <span style={{ fontSize: 10, background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 99, color: categoryObj.color, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              <CategoryIcon size={10} /> {categoryObj.label}
            </span>
            <span className={`badge ${priorityInfo.badgeClass}`} style={{ fontSize: 10 }}>
              <Flag size={10} /> {priorityInfo.label}
            </span>
            {!isDone && task.due_date && (() => {
              const due = new Date(task.due_date)
              if (task.due_time) {
                const [h, m] = task.due_time.split(':').map(Number)
                due.setHours(h || 0, m || 0, 0, 0)
              } else {
                due.setHours(23, 59, 59, 999)
              }
              if (due < new Date()) {
                return (
                  <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #EF4444', color: '#EF4444', padding: '2px 8px', borderRadius: 99 }}>
                    PASSED / OVERDUE
                  </span>
                )
              }
              return null
            })()}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {task.due_date && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={11} /> {formatDate(task.due_date)}
              </span>
            )}
            {task.due_time && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> {task.due_time}
              </span>
            )}
            {subtasks.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                {doneSubtasks}/{subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>

        {/* Date Completion Toggle Button */}
        <button
          onClick={() => onToggleDateCompletion(task.id, todayStr)}
          title={`Toggle completion for Today (${todayStr})`}
          style={{
            padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer',
            fontSize: 11, fontWeight: 600,
            background: isTodayDone ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)',
            color: isTodayDone ? '#10B981' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
          }}
        >
          {isTodayDone ? <CheckCircle2 size={12} color="#10B981" /> : <Circle size={12} />} Today
        </button>

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
