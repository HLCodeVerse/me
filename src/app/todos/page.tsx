'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  Plus, CheckCircle2, Trash2, Loader2, CheckSquare,
  Sparkles, Calendar, Check, Circle, Send, Layers, ListPlus
} from 'lucide-react'
import { toast } from 'sonner'
import { stripMarkdown } from '@/lib/utils'
import type { Task } from '@/lib/supabase/database.types'
import { createTodoistTask } from '@/lib/todoist'

type FilterTab = 'all' | 'pending' | 'done'

export default function TodosPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [todos, setTodos] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [inputVal, setInputVal] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [batchMode, setBatchMode] = useState(false)
  const [batchInput, setBatchInput] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchTodos = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'todo')
        .order('created_at', { ascending: false })
      setTodos(data ?? [])
    } catch {
      setTodos([])
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => { fetchTodos() }, [fetchTodos])

  async function addTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!inputVal.trim() || !user) return
    setSaving(true)
    const cleanTitle = stripMarkdown(inputVal.trim())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('tasks') as any).insert({
      user_id: user.id,
      title: cleanTitle,
      category: 'todo',
      status: 'todo',
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    }).select().single()

    if (error) { toast.error('Failed to add todo'); setSaving(false); return }
    createTodoistTask(cleanTitle, undefined, dueDate).catch(() => {})
    setTodos(prev => [data, ...prev])
    setInputVal('')
    setDueDate('')
    setSaving(false)
    toast.success('Todo added & synced!')
    inputRef.current?.focus()
  }

  async function handleBatchAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!batchInput.trim() || !user) return
    setSaving(true)

    const lines = batchInput.split('\n').map(s => stripMarkdown(s)).filter(s => s.length > 1)
    if (lines.length === 0) { setSaving(false); return }

    try {
      for (const line of lines) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('tasks') as any).insert({
          user_id: user.id,
          title: line,
          category: 'todo',
          status: 'todo',
        }).select().single()

        if (data) setTodos(prev => [data, ...prev])
      }

      setBatchInput('')
      setBatchMode(false)
      toast.success(`Imported ${lines.length} todos! 🚀`)
    } catch {
      toast.error('Failed to batch import todos')
    } finally {
      setSaving(false)
    }
  }

  async function toggleTodoStatus(todo: Task) {
    setCompleting(todo.id)
    const newStatus = todo.status === 'done' ? 'todo' : 'done'
    const today = new Date().toISOString().split('T')[0]
    const completedDates = (todo.completed_dates as Record<string, boolean>) || {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).update({
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      completed_dates: { ...completedDates, [today]: newStatus === 'done' }
    }).eq('id', todo.id)

    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: newStatus } : t))
    setCompleting(null)
    toast.success(newStatus === 'done' ? 'Todo completed! 🎉' : 'Todo reopened')
  }

  async function deleteTodo(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).delete().eq('id', id)
    setTodos(prev => prev.filter(t => t.id !== id))
    toast.success('Todo removed')
  }

  async function clearCompleted() {
    if (!user) return
    const doneIds = todos.filter(t => t.status === 'done').map(t => t.id)
    if (doneIds.length === 0) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).delete().in('id', doneIds)
    setTodos(prev => prev.filter(t => t.status !== 'done'))
    toast.success(`Cleared ${doneIds.length} completed todos!`)
  }

  async function markAllComplete() {
    if (!user) return
    const pendingIds = todos.filter(t => t.status !== 'done').map(t => t.id)
    if (pendingIds.length === 0) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).update({ status: 'done', completed_at: new Date().toISOString() }).in('id', pendingIds)
    setTodos(prev => prev.map(t => ({ ...t, status: 'done' })))
    toast.success('All todos marked complete!')
  }

  async function handleAITodoGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const promptToUse = aiPrompt.trim() || 'Generate 3 high-impact daily todos for focus'
    setAiGenerating(true)
    toast.info('AI is generating todos...')

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

      const titles = generatedText.split('\n').map(s => stripMarkdown(s)).filter(s => s.length > 2)
      for (const t of titles.slice(0, 3)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('tasks') as any).insert({
          user_id: user.id,
          title: t,
          category: 'todo',
          status: 'todo'
        }).select().single()
        if (data) setTodos(prev => [data, ...prev])
      }

      setAiPrompt('')
      toast.success('AI Todos created!')
      fetchTodos()
    } catch {
      toast.error('Could not generate AI todos')
    } finally {
      setAiGenerating(false)
    }
  }

  const pending = todos.filter(t => t.status !== 'done')
  const done = todos.filter(t => t.status === 'done')
  const completionRate = todos.length > 0 ? Math.round((done.length / todos.length) * 100) : 0

  const filteredTodos = todos.filter(t => {
    if (filter === 'pending') return t.status !== 'done'
    if (filter === 'done') return t.status === 'done'
    return true
  })

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckSquare size={20} color="#06B6D4" />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Quick Todos</h1>
          </div>
          <button
            onClick={() => setBatchMode(!batchMode)}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: 12, display: 'flex', gap: 6, color: '#06B6D4', borderColor: 'rgba(6,182,212,0.3)' }}
          >
            <ListPlus size={14} color="#06B6D4" /> {batchMode ? 'Single Add' : 'Batch Import'}
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* AI Prompt Bar */}
        <form onSubmit={handleAITodoGenerate} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
          <Sparkles size={18} color="#06B6D4" style={{ flexShrink: 0 }} />
          <input
            className="glow-input"
            placeholder="Tell AI to generate todos (e.g., '3 quick tasks to prepare for meeting')..."
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, fontSize: 13 }}
          />
          <button
            type="submit"
            disabled={aiGenerating}
            className="btn btn-primary"
            style={{ height: 34, padding: '0 12px', fontSize: 12, flexShrink: 0 }}
          >
            {aiGenerating ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> AI Generate</>}
          </button>
        </form>

        {/* Overview Stats Card */}
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Completion Velocity</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                {done.length} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>of {todos.length} done</span>
              </p>
            </div>
            <span className="badge badge-info" style={{ fontSize: 13, padding: '4px 12px' }}>
              {completionRate}% Done
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${completionRate}%`, background: '#06B6D4', height: '100%', borderRadius: 99, transition: 'width 400ms ease' }} />
          </div>
        </div>

        {/* Add Form */}
        {!batchMode ? (
          <form onSubmit={addTodo}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  ref={inputRef}
                  className="glow-input"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  placeholder="What needs to be done today? Press Enter..."
                  style={{ flex: 1, fontSize: 14 }}
                />
                <button type="submit" disabled={saving || !inputVal.trim()} className="btn btn-primary" style={{ height: 42, padding: '0 18px', flexShrink: 0 }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color="var(--text-muted)" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    style={{ height: 32, padding: '2px 10px', fontSize: 12, width: 'auto' }}
                  />
                </div>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBatchAdd} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={16} color="#06B6D4" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Batch Todo Import</span>
            </div>
            <textarea
              className="glow-input"
              rows={4}
              placeholder="Paste multiple todo items (one per line):&#10;Buy groceries&#10;Submit report&#10;Schedule doctor appointment"
              value={batchInput}
              onChange={e => setBatchInput(e.target.value)}
              style={{ fontSize: 13, lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setBatchMode(false)} className="btn btn-secondary" style={{ height: 36, fontSize: 12 }}>
                Cancel
              </button>
              <button type="submit" disabled={saving || !batchInput.trim()} className="btn btn-primary" style={{ height: 36, fontSize: 12 }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Import All Lines'}
              </button>
            </div>
          </form>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'pending', 'done'] as FilterTab[]).map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                  background: filter === t ? '#06B6D4' : 'var(--surface-2)',
                  color: filter === t ? '#FFFFFF' : 'var(--text-secondary)',
                  transition: 'all 150ms ease',
                }}
              >
                {t} ({t === 'all' ? todos.length : t === 'pending' ? pending.length : done.length})
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {pending.length > 0 && (
              <button
                onClick={markAllComplete}
                style={{ fontSize: 11, color: '#10B981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Check size={12} /> Mark All Done
              </button>
            )}
            {done.length > 0 && (
              <button
                onClick={clearCompleted}
                style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear Done
              </button>
            )}
          </div>
        </div>

        {/* Todos List */}
        <div>
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 50, borderRadius: 'var(--radius-btn)', marginBottom: 8 }} />)
          ) : filteredTodos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Sparkles size={24} color="#06B6D4" />
              </div>
              <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>No todos found</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Add a todo item above!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredTodos.map(todo => {
                const isDone = todo.status === 'done'
                return (
                  <div
                    key={todo.id}
                    className="card"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', background: isDone ? 'var(--surface-2)' : 'var(--surface)',
                      opacity: isDone ? 0.6 : 1,
                    }}
                  >
                    <button
                      onClick={() => toggleTodoStatus(todo)}
                      disabled={completing === todo.id}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                    >
                      {isDone ? (
                        <CheckCircle2 size={20} color="#10B981" className="check-pop" />
                      ) : (
                        <Circle size={20} color="var(--text-muted)" strokeWidth={1.5} />
                      )}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: 14, color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                        fontWeight: 600, textDecoration: isDone ? 'line-through' : 'none',
                        display: 'block'
                      }}>
                        {stripMarkdown(todo.title)}
                      </span>
                      {todo.due_date && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                          Due: {new Date(todo.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => deleteTodo(todo.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#EF4444' }}
                    >
                      <Trash2 size={15} />
                    </button>
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
