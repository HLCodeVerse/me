'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  Plus, CheckCircle2, Trash2, Loader2, CheckSquare, Brain,
  Sparkles, Calendar, Check, Circle
} from 'lucide-react'
import { toast } from 'sonner'
import type { Todo } from '@/lib/supabase/database.types'

type FilterTab = 'all' | 'pending' | 'done'

export default function TodosPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [inputVal, setInputVal] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchTodos = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setTodos(data ?? [])
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { fetchTodos() }, [fetchTodos])

  async function addTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!inputVal.trim() || !user) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('todos') as any).insert({
      user_id: user.id,
      title: inputVal.trim(),
      is_done: false,
      due_date: dueDate || null,
    }).select().single()

    if (error) { toast.error('Failed to add todo'); setSaving(false); return }
    setTodos(prev => [data, ...prev])
    setInputVal('')
    setDueDate('')
    setSaving(false)
    toast.success('Todo added!')
    inputRef.current?.focus()
  }

  async function toggleTodoStatus(todo: Todo) {
    setCompleting(todo.id)
    const newStatus = !todo.is_done
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('todos') as any).update({ is_done: newStatus }).eq('id', todo.id)
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, is_done: newStatus } : t))
    setCompleting(null)
    toast.success(newStatus ? 'Todo completed! 🎉' : 'Todo reopened')
  }

  async function deleteTodo(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('todos') as any).delete().eq('id', id)
    setTodos(prev => prev.filter(t => t.id !== id))
    toast.success('Todo removed')
  }

  async function clearCompleted() {
    if (!user) return
    const doneIds = todos.filter(t => t.is_done).map(t => t.id)
    if (doneIds.length === 0) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('todos') as any).delete().in('id', doneIds)
    setTodos(prev => prev.filter(t => !t.is_done))
    toast.success(`Cleared ${doneIds.length} completed todos!`)
  }

  async function markAllComplete() {
    if (!user) return
    const pendingIds = todos.filter(t => !t.is_done).map(t => t.id)
    if (pendingIds.length === 0) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('todos') as any).update({ is_done: true }).in('id', pendingIds)
    setTodos(prev => prev.map(t => ({ ...t, is_done: true })))
    toast.success('All todos marked complete!')
  }

  async function aiGenerateTodos() {
    if (!user) return
    setAiGenerating(true)
    toast.info('AI is generating smart daily todos...')
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: 'Generate 3 high-impact daily todos for focus and productivity. Keep titles under 7 words.'
          }],
          enableTools: false
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

      const titles = generatedText.split('\n').map(s => s.replace(/^[-*0-9.]+\s*/, '').trim()).filter(s => s.length > 2)
      for (const t of titles.slice(0, 3)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('todos') as any).insert({
          user_id: user.id,
          title: t,
          is_done: false
        }).select().single()
        if (data) setTodos(prev => [data, ...prev])
      }

      toast.success('AI Todos generated!')
    } catch {
      toast.error('Could not generate AI todos')
    } finally {
      setAiGenerating(false)
    }
  }

  const pending = todos.filter(t => !t.is_done)
  const done = todos.filter(t => t.is_done)
  const completionRate = todos.length > 0 ? Math.round((done.length / todos.length) * 100) : 0

  const filteredTodos = todos.filter(t => {
    if (filter === 'pending') return !t.is_done
    if (filter === 'done') return t.is_done
    return true
  })

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckSquare size={20} color="#818CF8" />
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Quick Todos</h1>
          </div>
          <button
            onClick={aiGenerateTodos}
            disabled={aiGenerating}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', height: 34,
              borderRadius: 'var(--radius-sm)', background: 'rgba(129,140,248,0.15)',
              border: '1px solid rgba(129,140,248,0.3)', cursor: 'pointer',
              color: '#818CF8', fontSize: 12, fontWeight: 700
            }}
          >
            {aiGenerating ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
            AI Smart Add
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Overview Stats Card */}
        <div className="card" style={{
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(129,140,248,0.12), rgba(16,185,129,0.06))',
          border: '1px solid rgba(129,140,248,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completion Velocity</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                {done.length} <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>of {todos.length} done</span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge badge-purple" style={{ fontSize: 13, padding: '4px 12px' }}>
                {completionRate}% Done
              </span>
            </div>
          </div>
          <div className="progress-track" style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99 }}>
            <div className="progress-fill" style={{ width: `${completionRate}%`, background: 'linear-gradient(90deg, #818CF8, #10B981)', height: '100%', borderRadius: 99 }} />
          </div>
        </div>

        {/* Add Todo Input Form */}
        <form onSubmit={addTodo}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                ref={inputRef}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="What needs to be done today? Press Enter..."
                style={{ flex: 1, fontSize: 15 }}
              />
              <button type="submit" disabled={saving || !inputVal.trim()} className="btn btn-primary" style={{ height: 42, padding: '0 20px', flexShrink: 0 }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <Calendar size={14} color="var(--text-dim)" />
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

        {/* Filter Tabs & Batch Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10, marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'pending', 'done'] as FilterTab[]).map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                  background: filter === t ? '#818CF8' : 'var(--surface-2)',
                  color: filter === t ? '#0A0B0D' : 'var(--text-muted)',
                  transition: 'all 200ms ease',
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
                style={{ fontSize: 11, color: '#10B981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Check size={12} /> Mark All Done
              </button>
            )}
            {done.length > 0 && (
              <button
                onClick={clearCompleted}
                style={{ fontSize: 11, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear Done
              </button>
            )}
          </div>
        </div>

        {/* Todos List */}
        <div>
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 50, borderRadius: 'var(--radius-sm)', marginBottom: 8 }} />)
          ) : filteredTodos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(129,140,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Sparkles size={24} color="#818CF8" />
              </div>
              <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>No todos found</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Add a task above or use AI Smart Add!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredTodos.map(todo => (
                <div
                  key={todo.id}
                  className="card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', background: todo.is_done ? 'var(--surface-2)' : 'var(--surface)',
                    opacity: todo.is_done ? 0.6 : 1,
                    border: `1px solid ${todo.is_done ? 'var(--border)' : 'var(--border-2)'}`,
                    transition: 'all 200ms ease',
                  }}
                >
                  <button
                    onClick={() => toggleTodoStatus(todo)}
                    disabled={completing === todo.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                  >
                    {todo.is_done ? (
                      <CheckCircle2 size={20} color="#10B981" />
                    ) : (
                      <Circle size={20} color="var(--text-dim)" strokeWidth={1.5} />
                    )}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 14, color: todo.is_done ? 'var(--text-muted)' : 'var(--text)',
                      fontWeight: 600, textDecoration: todo.is_done ? 'line-through' : 'none',
                      display: 'block'
                    }}>
                      {todo.title}
                    </span>
                    {todo.due_date && (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, display: 'block' }}>
                        Due: {new Date(todo.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => deleteTodo(todo.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-dim)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  )
}
