'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Plus, CheckCircle2, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Todo } from '@/lib/supabase/database.types'

export default function TodosPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchTodos = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setTodos(data ?? [])
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { fetchTodos() }, [fetchTodos])

  async function addTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!inputVal.trim() || !user) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('todos') as any).insert({ user_id: user.id, title: inputVal.trim(), is_done: false }).select().single()
    if (error) { toast.error('Failed to add'); setSaving(false); return }
    setTodos(prev => [data, ...prev])
    setInputVal('')
    setSaving(false)
    inputRef.current?.focus()
  }

  async function completeTodo(id: string) {
    setCompleting(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('todos') as any).update({ is_done: true }).eq('id', id)
    setTimeout(() => {
      setTodos(prev => prev.filter(t => t.id !== id))
      setCompleting(null)
      toast.success('Done! ✅')
    }, 500)
  }

  async function deleteTodo(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('todos') as any).delete().eq('id', id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const pending = todos.filter(t => !t.is_done)
  const done    = todos.filter(t => t.is_done)

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Quick Todo</h1>
          <span className="badge badge-muted" style={{ marginLeft: 10 }}>{pending.length}</span>
        </div>
      }
    >
      {/* Quick capture input */}
      <div style={{ paddingTop: 16 }}>
        <form onSubmit={addTodo}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              ref={inputRef}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="What needs to be done?"
              style={{ flex: 1, fontSize: 15 }}
            />
            <button type="submit" disabled={saving || !inputVal.trim()} className="btn btn-primary" style={{ height: 42, padding: '0 16px', flexShrink: 0 }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
            </button>
          </div>
        </form>
      </div>

      {/* Pending todos */}
      <div style={{ marginTop: 24 }}>
        {loading
          ? [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 'var(--radius-sm)', marginBottom: 8 }} />)
          : pending.length === 0
          ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-dim)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
              <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>All clear!</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Add something above to get started.</p>
            </div>
          )
          : pending.map(todo => (
            <div
              key={todo.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 14px', marginBottom: 8,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                opacity: completing === todo.id ? 0.4 : 1,
                transition: 'opacity 300ms ease, transform 300ms ease',
                transform: completing === todo.id ? 'translateX(10px)' : 'none',
              }}
            >
              <button
                onClick={() => completeTodo(todo.id)}
                disabled={completing === todo.id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '2px solid var(--border-2)',
                  transition: 'border-color 200ms',
                }} />
              </button>
              <span style={{ flex: 1, fontSize: 15, color: 'var(--text)' }}>{todo.title}</span>
              <button
                onClick={() => deleteTodo(todo.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0.4 }}
              >
                <Trash2 size={15} color="var(--text-dim)" />
              </button>
            </div>
          ))
        }
      </div>

      {/* Completed section */}
      {done.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <CheckCircle2 size={14} color="var(--growth)" />
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Completed ({done.length})
            </span>
          </div>
          {done.slice(0, 5).map(todo => (
            <div
              key={todo.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', marginBottom: 6,
                background: 'transparent', borderRadius: 'var(--radius-sm)',
                opacity: 0.4,
              }}
            >
              <CheckCircle2 size={18} color="var(--growth)" />
              <span style={{ flex: 1, fontSize: 14, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{todo.title}</span>
              <button onClick={() => deleteTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={14} color="var(--text-dim)" />
              </button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
