'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  Plus, CheckCircle2, Trash2, Loader2, CheckSquare,
  Sparkles, Calendar, Check, Circle, Send
} from 'lucide-react'
import { toast } from 'sonner'
import { stripMarkdown } from '@/lib/utils'
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
  const [aiPrompt, setAiPrompt] = useState('')
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
    const cleanTitle = stripMarkdown(inputVal.trim())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('todos') as any).insert({
      user_id: user.id,
      title: cleanTitle,
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

  async function handleAITodoGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const promptToUse = aiPrompt.trim() || 'Generate 3 high-impact daily todos for focus'
    setAiGenerating(true)
    toast.info('AI is generating smart todos from your prompt...')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Generate 3 todo items based on user instruction: "${promptToUse}". Return ONLY plain text todo items separated by line breaks, without bullet points, numbers, or markdown formatting.`
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

      const titles = generatedText.split('\n').map(s => stripMarkdown(s)).filter(s => s.length > 2)
      for (const t of titles.slice(0, 3)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('todos') as any).insert({
          user_id: user.id,
          title: t,
          is_done: false
        }).select().single()
        if (data) setTodos(prev => [data, ...prev])
      }

      setAiPrompt('')
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
            <CheckSquare size={20} color="#3B82F6" />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Quick Todos</h1>
          </div>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* AI Custom Prompt Bar */}
        <form onSubmit={handleAITodoGenerate} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
          <Sparkles size={18} color="#3B82F6" style={{ flexShrink: 0 }} />
          <input
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
            <div style={{ width: `${completionRate}%`, background: '#3B82F6', height: '100%', borderRadius: 99, transition: 'width 400ms ease' }} />
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

        {/* Filter Tabs & Batch Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'pending', 'done'] as FilterTab[]).map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                  background: filter === t ? '#3B82F6' : 'var(--surface-2)',
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
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Sparkles size={24} color="#3B82F6" />
              </div>
              <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>No todos found</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Add a todo item or use AI prompt bar above!</p>
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
                    border: `1px solid ${todo.is_done ? 'var(--border)' : 'var(--border)'}`,
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
                      <Circle size={20} color="var(--text-muted)" strokeWidth={1.5} />
                    )}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 14, color: todo.is_done ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontWeight: 600, textDecoration: todo.is_done ? 'line-through' : 'none',
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}
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
