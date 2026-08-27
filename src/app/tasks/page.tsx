'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  Plus, LayoutList, Columns, ChevronDown, ChevronRight,
  Circle, CheckCircle2, Loader2, X, Repeat
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, getPriorityColor, getPriorityLabel } from '@/lib/utils'
import type { Task } from '@/lib/supabase/database.types'

type ViewMode = 'list' | 'kanban'
type FilterStatus = 'all' | 'todo' | 'in_progress' | 'done'

const STATUSES = ['todo', 'in_progress', 'done']
const STATUS_LABELS: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const STATUS_COLORS: Record<string, string> = { todo: 'var(--text-muted)', in_progress: 'var(--focus)', done: 'var(--growth)' }

export default function TasksPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('list')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  // New task form
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState(2)
  const [newDueDate, setNewDueDate] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchTasks = useCallback(async () => {
    if (!user) return
    let q = supabase.from('tasks').select('*').eq('user_id', user.id).is('parent_task_id', null).order('priority', { ascending: false }).order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setTasks(data ?? [])
    setLoading(false)
  }, [user, supabase, filter])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !user) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('tasks') as any).insert({
      user_id: user.id, title: newTitle.trim(),
      description: newDesc || null, priority: newPriority,
      due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
      status: 'todo',
    })
    if (error) { toast.error('Failed to add task'); setSaving(false); return }
    toast.success('Task added!')
    setNewTitle(''); setNewDesc(''); setNewDueDate(''); setNewPriority(2)
    setShowAddForm(false)
    setSaving(false)
    fetchTasks()
  }

  async function updateStatus(taskId: string, status: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
    if (status === 'done') toast.success('Task completed! 🎉')
  }

  async function deleteTask(taskId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    toast.success('Task deleted')
  }

  const filteredTasks = tasks // already filtered via query

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Tasks</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* View toggle */}
            <button
              onClick={() => setView(v => v === 'list' ? 'kanban' : 'list')}
              style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              {view === 'list' ? <Columns size={16} color="var(--text-muted)" /> : <LayoutList size={16} color="var(--text-muted)" />}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
              style={{ height: 36, padding: '0 14px', fontSize: 13 }}
            >
              <Plus size={15} /> Add
            </button>
          </div>
        </div>
      }
    >
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, paddingTop: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {(['all', 'todo', 'in_progress', 'done'] as FilterStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
              background: filter === f ? 'var(--growth)' : 'var(--surface-2)',
              color: filter === f ? '#0A0B0D' : 'var(--text-muted)',
              transition: 'all 200ms ease',
              flexShrink: 0,
            }}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {/* List View */}
      {view === 'list' && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading
            ? [1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 'var(--radius)' }} />)
            : filteredTasks.length === 0
            ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <p style={{ fontWeight: 600 }}>No tasks here</p>
                <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-dim)' }}>Click &ldquo;Add&rdquo; to create your first task</p>
              </div>
            )
            : filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                expanded={expandedTasks.has(task.id)}
                onToggleExpand={() => setExpandedTasks(prev => {
                  const s = new Set(prev)
                  if (s.has(task.id)) { s.delete(task.id) } else { s.add(task.id) }
                  return s
                })}
                onStatusChange={updateStatus}
                onDelete={deleteTask}
              />
            ))
          }
        </div>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div style={{ marginTop: 16, display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
          {STATUSES.map(status => {
            const colTasks = tasks.filter(t => t.status === status)
            return (
              <div key={status} className="kanban-col">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status] }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</span>
                  </div>
                  <span className="badge badge-muted">{colTasks.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colTasks.map(task => (
                    <div key={task.id} className="card-2" style={{ padding: '12px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>{task.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: getPriorityColor(task.priority), fontWeight: 600 }}>
                          {getPriorityLabel(task.priority)}
                        </span>
                        {task.due_date && (
                          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{formatDate(task.due_date)}</span>
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
          <div className="animate-scale-in" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            padding: '24px 20px', zIndex: 110,
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            maxWidth: 768, margin: '0 auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>New Task</h3>
              <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            <form onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                placeholder="Task title..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                autoFocus
                required
                style={{ fontSize: 16, fontWeight: 500 }}
              />
              <textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={2}
                style={{ resize: 'none' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 6, display: 'block', letterSpacing: '0.04em' }}>PRIORITY</label>
                  <select value={newPriority} onChange={e => setNewPriority(Number(e.target.value))}>
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                    <option value={4}>Critical</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 6, display: 'block', letterSpacing: '0.04em' }}>DUE DATE</label>
                  <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
                </div>
              </div>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ height: 46, fontSize: 15 }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Add Task</>}
              </button>
            </form>
          </div>
        </>
      )}
    </AppShell>
  )
}

function TaskCard({ task, expanded, onToggleExpand, onStatusChange, onDelete }: {
  task: Task
  expanded: boolean
  onToggleExpand: () => void
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const isDone = task.status === 'done'
  const pColor = getPriorityColor(task.priority)

  return (
    <div className="card" style={{
      padding: '14px 16px',
      opacity: isDone ? 0.6 : 1,
      transition: 'opacity 200ms',
      borderLeft: `3px solid ${pColor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => onStatusChange(task.id, isDone ? 'todo' : 'done')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
        >
          {isDone
            ? <CheckCircle2 size={20} color="var(--growth)" fill="rgba(52,211,153,0.15)" />
            : <Circle size={20} color={pColor} strokeWidth={1.5} />
          }
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: 500, color: 'var(--text)',
            textDecoration: isDone ? 'line-through' : 'none',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {task.title}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: pColor, fontWeight: 600 }}>{getPriorityLabel(task.priority)}</span>
            {task.due_date && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>· {formatDate(task.due_date)}</span>}
            {task.recurrence_rule && <Repeat size={10} color="var(--info)" />}
          </div>
        </div>
        <button
          onClick={onToggleExpand}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
        >
          {expanded ? <ChevronDown size={16} color="var(--text-dim)" /> : <ChevronRight size={16} color="var(--text-dim)" />}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          {task.description && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>{task.description}</p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {task.status !== 'in_progress' && task.status !== 'done' && (
              <button onClick={() => onStatusChange(task.id, 'in_progress')} className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px', height: 32 }}>
                Start
              </button>
            )}
            {task.status === 'in_progress' && (
              <button onClick={() => onStatusChange(task.id, 'done')} className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px', height: 32 }}>
                Complete
              </button>
            )}
            <button onClick={() => onDelete(task.id)} className="btn btn-danger" style={{ fontSize: 12, padding: '6px 12px', height: 32, marginLeft: 'auto' }}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
